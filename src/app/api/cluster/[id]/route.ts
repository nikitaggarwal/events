import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const cluster = await prisma.cluster.findUnique({
    where: { id },
    include: {
      jobs: {
        include: { company: true },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!cluster) {
    return NextResponse.json({ error: "Cluster not found" }, { status: 404 });
  }

  return NextResponse.json(cluster, {
    headers: { "Cache-Control": "s-maxage=60, stale-while-revalidate=300" },
  });
}
