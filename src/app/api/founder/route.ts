import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const eventId = request.nextUrl.searchParams.get("eventId");
  const companyId = request.nextUrl.searchParams.get("companyId");

  if (!eventId || !companyId) {
    return NextResponse.json({ error: "eventId and companyId required" }, { status: 400 });
  }

  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: {
      clusterId: true,
      cluster: { select: { id: true, type: true } },
    },
  });

  const [candidates, interactions, company] = await Promise.all([
    prisma.candidate.findMany({
      where: { eventId },
      select: {
        id: true,
        name: true,
        title: true,
        company: true,
        profileUrl: true,
        highlights: true,
        fitScore: true,
        source: true,
        experience: true,
      },
      orderBy: { fitScore: "desc" },
    }),
    prisma.founderInteraction.findMany({
      where: { eventId, companyId },
    }),
    prisma.company.findFirst({
      where: { id: companyId },
      select: {
        id: true,
        name: true,
        slug: true,
        batch: true,
        jobs: {
          select: { id: true, title: true, clusterId: true },
        },
      },
    }),
  ]);

  const isDomain = event?.cluster?.type === "domain";
  const eventClusterId = event?.clusterId;

  const allJobs = (company?.jobs || []).map((j) => ({
    id: j.id,
    title: j.title,
    relevant: isDomain ? true : (j.clusterId === eventClusterId),
  }));

  const interactionMap = new Map(
    interactions.map((i) => [i.candidateId, i])
  );

  const merged = candidates.map((c) => {
    const interaction = interactionMap.get(c.id);
    return {
      ...c,
      contacted: interaction?.contacted ?? false,
      rsvp: interaction?.rsvp ?? false,
      attended: interaction?.attended ?? false,
      starred: interaction?.starred ?? false,
      spoke: interaction?.spoke ?? false,
      rating: interaction?.rating ?? null,
      notes: interaction?.notes ?? null,
      followUp: interaction?.followUp ?? false,
      interviewed: interaction?.interviewed ?? false,
      offered: interaction?.offered ?? false,
      hired: interaction?.hired ?? false,
    };
  });

  const count = (key: string) => merged.filter((c) => (c as Record<string, unknown>)[key] === true).length;

  return NextResponse.json({
    candidates: merged,
    company: company ? { id: company.id, name: company.name, slug: company.slug, batch: company.batch, jobs: allJobs } : null,
    clusterType: event?.cluster?.type || "role",
    stats: {
      total: merged.length,
      contacted: count("contacted"),
      rsvp: count("rsvp"),
      attended: count("attended"),
      starred: count("starred"),
      spoke: count("spoke"),
      followUp: count("followUp"),
      interviewed: count("interviewed"),
      offered: count("offered"),
      hired: count("hired"),
    },
  });
}

export async function POST(request: Request) {
  const body = await request.json();
  const { candidateId, companyId, eventId, ...data } = body;

  if (!candidateId || !companyId || !eventId) {
    return NextResponse.json(
      { error: "candidateId, companyId, and eventId required" },
      { status: 400 }
    );
  }

  const interaction = await prisma.founderInteraction.upsert({
    where: {
      candidateId_companyId_eventId: { candidateId, companyId, eventId },
    },
    update: data,
    create: { candidateId, companyId, eventId, ...data },
  });

  return NextResponse.json(interaction);
}
