import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const [jobCount, companyCount, clusterCount] = await Promise.all([
    prisma.job.count(),
    prisma.company.count(),
    prisma.cluster.count(),
  ]);

  return NextResponse.json(
    { jobCount, companyCount, clusterCount },
    { headers: { "Cache-Control": "s-maxage=60, stale-while-revalidate=300" } }
  );
}
