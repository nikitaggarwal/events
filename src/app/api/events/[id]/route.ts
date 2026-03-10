import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const event = await prisma.event.findUnique({
    where: { id },
    include: {
      cluster: {
        include: {
          jobs: { include: { company: true } },
          companies: {
            include: {
              jobs: { include: { company: true } },
            },
          },
        },
      },
      candidates: { orderBy: { fitScore: "desc" } },
    },
  });

  if (!event) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }

  const aggs: { contacted: bigint; rsvp: bigint; attended: bigint; starred: bigint; spoke: bigint; followUp: bigint; interviewed: bigint; offered: bigint; hired: bigint }[] =
    await prisma.$queryRaw`
      SELECT
        COUNT(*) FILTER (WHERE "contacted") as contacted,
        COUNT(*) FILTER (WHERE "rsvp") as rsvp,
        COUNT(*) FILTER (WHERE "attended") as attended,
        COUNT(*) FILTER (WHERE "starred") as starred,
        COUNT(*) FILTER (WHERE "spoke") as spoke,
        COUNT(*) FILTER (WHERE "followUp") as "followUp",
        COUNT(*) FILTER (WHERE "interviewed") as interviewed,
        COUNT(*) FILTER (WHERE "offered") as offered,
        COUNT(*) FILTER (WHERE "hired") as hired
      FROM "FounderInteraction"
      WHERE "eventId" = ${id}
    `;

  const a = aggs[0];
  const interactionStats = {
    contacted: Number(a?.contacted ?? 0),
    rsvp: Number(a?.rsvp ?? 0),
    attended: Number(a?.attended ?? 0),
    starred: Number(a?.starred ?? 0),
    spoke: Number(a?.spoke ?? 0),
    followUp: Number(a?.followUp ?? 0),
    interviewed: Number(a?.interviewed ?? 0),
    offered: Number(a?.offered ?? 0),
    hired: Number(a?.hired ?? 0),
  };

  // Derive best status per candidate from interactions (across all companies)
  const candidateStatuses: { candidateId: string; contacted: boolean; rsvp: boolean; attended: boolean }[] =
    await prisma.$queryRaw`
      SELECT "candidateId",
        bool_or("contacted") as contacted,
        bool_or("rsvp") as rsvp,
        bool_or("attended") as attended
      FROM "FounderInteraction"
      WHERE "eventId" = ${id}
      GROUP BY "candidateId"
    `;

  const statusMap = new Map(candidateStatuses.map((s) => [s.candidateId, s]));

  const enrichedCandidates = event.candidates.map((c) => {
    const s = statusMap.get(c.id);
    let derivedStatus = c.inviteStatus;
    if (s) {
      if (s.attended) derivedStatus = "attended";
      else if (s.rsvp) derivedStatus = "rsvp";
      else if (s.contacted) derivedStatus = "contacted";
    }
    return { ...c, inviteStatus: derivedStatus };
  });

  const base = { ...event, candidates: enrichedCandidates, interactionStats };

  if (event.cluster && event.cluster.type === "domain") {
    const domainJobs = event.cluster.companies.flatMap((c) => c.jobs);
    return NextResponse.json(
      { ...base, cluster: { ...event.cluster, jobs: domainJobs, companies: undefined } },
      { headers: { "Cache-Control": "s-maxage=15, stale-while-revalidate=60" } }
    );
  }

  if (base.cluster) {
    (base.cluster as Record<string, unknown>).companies = undefined;
  }

  return NextResponse.json(base, {
    headers: { "Cache-Control": "s-maxage=15, stale-while-revalidate=60" },
  });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();

  const event = await prisma.event.update({
    where: { id },
    data: {
      ...(body.name && { name: body.name }),
      ...(body.date && { date: new Date(body.date) }),
      ...(body.location && { location: body.location }),
      ...(body.description !== undefined && { description: body.description }),
      ...(body.status && { status: body.status }),
      ...(body.clusterId !== undefined && { clusterId: body.clusterId }),
    },
    include: { cluster: true, candidates: true },
  });

  return NextResponse.json(event);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  await prisma.candidate.deleteMany({ where: { eventId: id } });
  await prisma.event.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
