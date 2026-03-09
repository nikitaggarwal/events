import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  scrapeWaaSListings,
  scrapeJobDetail,
  isSFBayArea,
} from "@/lib/scraper";

export const maxDuration = 300;

export async function POST() {
  try {
    const listings = await scrapeWaaSListings();

    let created = 0;
    let skipped = 0;
    let detailed = 0;

    for (const listing of listings) {
      const existing = await prisma.job.findUnique({
        where: { sourceUrl: listing.jobUrl },
      });
      if (existing) {
        skipped++;
        continue;
      }

      const detail = await scrapeJobDetail(listing.jobUrl);
      if (detail) detailed++;

      const location = detail?.location || listing.location;
      if (location && !isSFBayArea(location)) {
        skipped++;
        continue;
      }

      const companySlug = detail?.companySlug || listing.companySlug;
      const companyName =
        detail?.companyName || listing.companyName || companySlug;

      let company = await prisma.company.findUnique({
        where: { slug: companySlug },
      });
      if (!company) {
        company = await prisma.company.create({
          data: {
            name: companyName,
            slug: companySlug,
            batch: detail?.batch || listing.batch,
            description: detail?.companyDescription || listing.companyDescription,
            url: `https://www.ycombinator.com/companies/${companySlug}`,
          },
        });
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
      created++;

      await new Promise((r) => setTimeout(r, 400));
    }

    return NextResponse.json({
      success: true,
      total: listings.length,
      created,
      skipped,
      detailed,
    });
  } catch (error) {
    console.error("Scrape error:", error);
    return NextResponse.json(
      { error: "Scraping failed", details: String(error) },
      { status: 500 }
    );
  }
}

export async function GET() {
  const jobs = await prisma.job.findMany({
    include: { company: true, cluster: true },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(jobs);
}
