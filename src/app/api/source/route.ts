import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sourceCandidatesForCluster } from "@/lib/exa";

export const maxDuration = 120;

export async function POST(request: Request) {
  try {
    const { clusterId, eventId } = await request.json();

    if (!clusterId) {
      return NextResponse.json(
        { error: "clusterId is required" },
        { status: 400 }
      );
    }

    const cluster = await prisma.cluster.findUnique({
      where: { id: clusterId },
      include: { jobs: true },
    });

    if (!cluster) {
      return NextResponse.json(
        { error: "Cluster not found" },
        { status: 404 }
      );
    }

    const jobTitles = cluster.jobs.map((j) => j.title);

    const sourced = await sourceCandidatesForCluster(
      cluster.name,
      cluster.keywords,
      jobTitles
    );

    const data = sourced.map((s) => ({
      name: s.name,
      title: s.title,
      company: s.company,
      location: s.location,
      profileUrl: s.profileUrl,
      highlights: s.highlights,
      source: s.source,
      eventId: eventId || null,
    }));

    await prisma.candidate.createMany({ data });

    const candidates = await prisma.candidate.findMany({
      where: { eventId: eventId || undefined },
      orderBy: { createdAt: "desc" },
      take: data.length,
    });

    return NextResponse.json({
      success: true,
      count: candidates.length,
      candidates,
    });
  } catch (error) {
    console.error("Source error:", error);
    return NextResponse.json(
      { error: "Sourcing failed", details: String(error) },
      { status: 500 }
    );
  }
}
