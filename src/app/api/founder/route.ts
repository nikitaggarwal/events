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
    select: { clusterId: true },
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
          where: event?.clusterId ? { clusterId: event.clusterId } : { id: "none" },
          select: { id: true, title: true },
        },
      },
    }),
  ]);

  const interactionMap = new Map(
    interactions.map((i) => [i.candidateId, i])
  );

  const merged = candidates.map((c) => {
    const interaction = interactionMap.get(c.id);
    return {
      ...c,
      starred: interaction?.starred ?? false,
      spoke: interaction?.spoke ?? false,
      rating: interaction?.rating ?? null,
      notes: interaction?.notes ?? null,
      followUp: interaction?.followUp ?? false,
    };
  });

  return NextResponse.json({
    candidates: merged,
    company,
    stats: {
      total: merged.length,
      starred: merged.filter((c) => c.starred).length,
      spoke: merged.filter((c) => c.spoke).length,
      followUp: merged.filter((c) => c.followUp).length,
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
