import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  scrapeWaaSListings,
  scrapeFromYCDirectory,
  scrapeJobDetail,
  isSFBayArea,
  type ScrapedJob,
} from "@/lib/scraper";

export const maxDuration = 300;

async function processJob(listing: ScrapedJob): Promise<"created" | "skipped" | "error"> {
  try {
    const existing = await prisma.job.findUnique({
      where: { sourceUrl: listing.jobUrl },
    });
    if (existing) return "skipped";

    let detail = null;
    try {
      detail = await scrapeJobDetail(listing.jobUrl);
    } catch {
      // continue without detail
    }

    const location = detail?.location || listing.location;
    if (location && !isSFBayArea(location)) return "skipped";

    const companySlug = detail?.companySlug || listing.companySlug;
    const companyName =
      detail?.companyName || listing.companyName || companySlug;

    let company = await prisma.company.findUnique({
      where: { slug: companySlug },
    });
    if (!company) {
      try {
        company = await prisma.company.create({
          data: {
            name: companyName,
            slug: companySlug,
            batch: detail?.batch || listing.batch,
            description: detail?.companyDescription || listing.companyDescription,
            url: `https://www.ycombinator.com/companies/${companySlug}`,
          },
        });
      } catch {
        company = await prisma.company.findUnique({ where: { slug: companySlug } });
        if (!company) return "error";
      }
    } else if (!company.name && companyName) {
      company = await prisma.company.update({
        where: { slug: companySlug },
        data: { name: companyName },
      });
    }

    await prisma.job.create({
      data: {
        title: detail?.title || listing.title,
        slug: listing.jobUrl.split("/").pop() || null,
        location,
        jobType: detail?.jobType || listing.jobType,
        role: detail?.role || listing.role,
        experience: detail?.experience,
        salaryMin: detail?.salaryMin,
        salaryMax: detail?.salaryMax,
        equity: detail?.equity,
        visa: detail?.visa,
        skills: detail?.skills || [],
        description: detail?.description || "",
        sourceUrl: listing.jobUrl,
        postedAt: listing.postedAt,
        companyId: company.id,
        embedding: [],
      },
    });
    return "created";
  } catch {
    return "error";
  }
}

export async function POST() {
  try {
    const [waasListings, ycDirListings] = await Promise.all([
      scrapeWaaSListings(),
      scrapeFromYCDirectory(),
    ]);

    const allListings = [...waasListings, ...ycDirListings].filter(
      (job, i, arr) => arr.findIndex((j) => j.jobUrl === job.jobUrl) === i
    );

    let created = 0;
    let skipped = 0;
    const DETAIL_BATCH = 5;

    for (let i = 0; i < allListings.length; i += DETAIL_BATCH) {
      const batch = allListings.slice(i, i + DETAIL_BATCH);
      const results = await Promise.all(batch.map(processJob));
      for (const r of results) {
        if (r === "created") created++;
        else if (r === "skipped") skipped++;
      }
    }

    return NextResponse.json({
      success: true,
      total: allListings.length,
      fromWaaS: waasListings.length,
      fromYCDirectory: ycDirListings.length,
      created,
      skipped,
    });
  } catch (error) {
    console.error("Scrape error:", error);
    return NextResponse.json(
      { error: "Scraping failed", details: String(error) },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 200);
  const offset = parseInt(searchParams.get("offset") || "0");

  const [jobs, total] = await Promise.all([
    prisma.job.findMany({
      include: { company: true, cluster: true },
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
    }),
    prisma.job.count(),
  ]);

  return NextResponse.json(
    { jobs, total, limit, offset },
    { headers: { "Cache-Control": "s-maxage=30, stale-while-revalidate=120" } }
  );
}
