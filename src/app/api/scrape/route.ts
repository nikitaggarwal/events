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
    const sfListings = listings.filter(
      (l) => isSFBayArea(l.location) || !l.location
    );

    let created = 0;
    let skipped = 0;
    let detailed = 0;

    for (const listing of sfListings) {
      const existing = await prisma.job.findUnique({
        where: { sourceUrl: listing.jobUrl },
      });
      if (existing) {
        skipped++;
        continue;
      }

      let company = await prisma.company.findUnique({
        where: { slug: listing.companySlug },
      });
      if (!company) {
        company = await prisma.company.create({
          data: {
            name: listing.companyName,
            slug: listing.companySlug,
            batch: listing.batch,
            description: listing.companyDescription,
            url: `https://www.ycombinator.com/companies/${listing.companySlug}`,
          },
        });
      }

      let detail = await scrapeJobDetail(listing.jobUrl);
      if (detail) detailed++;

      const isSF = detail?.location
        ? isSFBayArea(detail.location)
        : isSFBayArea(listing.location);

      if (detail?.location && !isSF && listing.location && !isSFBayArea(listing.location)) {
        skipped++;
        continue;
      }

      await prisma.job.create({
        data: {
          title: detail?.title || listing.title,
          slug: listing.jobUrl.split("/").pop() || null,
          location: detail?.location || listing.location,
          jobType: detail?.jobType || listing.jobType,
          role: detail?.role || listing.role,
          experience: detail?.experience,
          salaryMin: detail?.salaryMin,
          salaryMax: detail?.salaryMax,
          equity: detail?.equity,
          visa: detail?.visa,
          skills: detail?.skills || [],
          description: detail?.description,
          sourceUrl: listing.jobUrl,
          postedAt: listing.postedAt,
          companyId: company.id,
          embedding: [],
        },
      });
      created++;

      await new Promise((r) => setTimeout(r, 500));
    }

    return NextResponse.json({
      success: true,
      total: listings.length,
      sfFiltered: sfListings.length,
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
