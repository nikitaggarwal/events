import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { pipelineInteractionStatsFromCandidates } from "@/lib/candidate-pipeline-stage";

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

  // Per-candidate flags: any founder interaction on this event (OR across companies)
  const candidateInteractionAgg: {
    candidateId: string;
    contacted: boolean;
    rsvp: boolean;
    attended: boolean;
    starred: boolean;
    spoke: boolean;
    followUp: boolean;
    interviewed: boolean;
    offered: boolean;
    hired: boolean;
  }[] = await prisma.$queryRaw`
      SELECT "candidateId",
        bool_or("contacted") as contacted,
        bool_or("rsvp") as rsvp,
        bool_or("attended") as attended,
        bool_or("starred") as starred,
        bool_or("spoke") as spoke,
        bool_or("followUp") as "followUp",
        bool_or("interviewed") as interviewed,
        bool_or("offered") as offered,
        bool_or("hired") as hired
      FROM "FounderInteraction"
      WHERE "eventId" = ${id}
      GROUP BY "candidateId"
    `;

  const interactionMap = new Map(
    candidateInteractionAgg.map((row) => [row.candidateId, row])
  );

  const enrichedCandidates = event.candidates.map((c) => {
    const s = interactionMap.get(c.id);
    let derivedStatus = c.inviteStatus;
    if (s) {
      if (s.attended) derivedStatus = "attended";
      else if (s.rsvp) derivedStatus = "rsvp";
      else if (s.contacted) derivedStatus = "contacted";
    }
    return {
      ...c,
      inviteStatus: derivedStatus,
      founderInteraction: s
        ? {
            contacted: s.contacted,
            rsvp: s.rsvp,
            attended: s.attended,
            starred: s.starred,
            spoke: s.spoke,
            followUp: s.followUp,
            interviewed: s.interviewed,
            offered: s.offered,
            hired: s.hired,
          }
        : null,
    };
  });

  const pipeline = pipelineInteractionStatsFromCandidates(enrichedCandidates);
  const interactionStats = {
    contacted: pipeline.contacted,
    rsvp: pipeline.rsvp,
    attended: pipeline.attended,
    starred: pipeline.starred,
    spoke: pipeline.spoke,
    followUp: pipeline.followUp,
    interviewed: pipeline.interviewed,
    offered: pipeline.offered,
    hired: pipeline.hired,
  };

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
