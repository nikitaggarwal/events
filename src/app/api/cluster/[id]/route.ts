import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const JOB_SELECT = {
  id: true,
  title: true,
  location: true,
  role: true,
  salaryMin: true,
  salaryMax: true,
  skills: true,
  sourceUrl: true,
  postedAt: true,
  company: {
    select: { id: true, name: true, slug: true, batch: true },
  },
} as const;

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const cluster = await prisma.cluster.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      type: true,
      keywords: true,
      jobCount: true,
      companyCount: true,
      jobs: { select: JOB_SELECT, orderBy: { createdAt: "desc" } },
      companies: {
        select: {
          id: true,
          jobs: { select: JOB_SELECT, orderBy: { createdAt: "desc" } },
        },
      },
    },
  });

  if (!cluster) {
    return NextResponse.json({ error: "Cluster not found" }, { status: 404 });
  }

  const jobs =
    cluster.type === "domain"
      ? cluster.companies.flatMap((c) => c.jobs)
      : cluster.jobs;

  return NextResponse.json(
    {
      id: cluster.id,
      name: cluster.name,
      type: cluster.type,
      keywords: cluster.keywords,
      jobCount: cluster.jobCount,
      companyCount: cluster.companyCount,
      jobs,
    },
    { headers: { "Cache-Control": "s-maxage=60, stale-while-revalidate=300" } }
  );
}
