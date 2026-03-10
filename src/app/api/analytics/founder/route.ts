import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const companyId = request.nextUrl.searchParams.get("companyId");
  if (!companyId) {
    return NextResponse.json({ error: "companyId required" }, { status: 400 });
  }

  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: { id: true, name: true, batch: true, _count: { select: { jobs: true } } },
  });

  // All interactions for this company
  const interactions = await prisma.founderInteraction.findMany({
    where: { companyId },
    select: {
      eventId: true,
      candidateId: true,
      contacted: true,
      rsvp: true,
      attended: true,
      starred: true,
      spoke: true,
      followUp: true,
      interviewed: true,
      offered: true,
      hired: true,
    },
  });

  // Per-event breakdown
  const eventMap = new Map<string, {
    contacted: number; rsvp: number; attended: number;
    starred: number; spoke: number; followUp: number;
    interviewed: number; offered: number; hired: number;
    total: number;
  }>();

  for (const i of interactions) {
    const agg = eventMap.get(i.eventId) || { contacted: 0, rsvp: 0, attended: 0, starred: 0, spoke: 0, followUp: 0, interviewed: 0, offered: 0, hired: 0, total: 0 };
    agg.total++;
    if (i.contacted) agg.contacted++;
    if (i.rsvp) agg.rsvp++;
    if (i.attended) agg.attended++;
    if (i.starred) agg.starred++;
    if (i.spoke) agg.spoke++;
    if (i.followUp) agg.followUp++;
    if (i.interviewed) agg.interviewed++;
    if (i.offered) agg.offered++;
    if (i.hired) agg.hired++;
    eventMap.set(i.eventId, agg);
  }

  const eventIds = [...eventMap.keys()];
  const events = await prisma.event.findMany({
    where: { id: { in: eventIds } },
    select: { id: true, name: true, date: true, status: true },
    orderBy: { date: "desc" },
  });

  const eventRows = events.map((e) => {
    const s = eventMap.get(e.id)!;
    return {
      ...e,
      ...s,
      rsvpRate: s.contacted > 0 ? s.rsvp / s.contacted : 0,
      attendRate: s.rsvp > 0 ? s.attended / s.rsvp : 0,
      interviewRate: s.spoke > 0 ? s.interviewed / s.spoke : 0,
      hireRate: s.total > 0 ? s.hired / s.total : 0,
    };
  });

  // Totals
  const totals = {
    events: eventRows.length,
    candidates: interactions.length,
    contacted: interactions.filter((i) => i.contacted).length,
    rsvp: interactions.filter((i) => i.rsvp).length,
    attended: interactions.filter((i) => i.attended).length,
    starred: interactions.filter((i) => i.starred).length,
    spoke: interactions.filter((i) => i.spoke).length,
    followUp: interactions.filter((i) => i.followUp).length,
    interviewed: interactions.filter((i) => i.interviewed).length,
    offered: interactions.filter((i) => i.offered).length,
    hired: interactions.filter((i) => i.hired).length,
    uniqueCandidates: new Set(interactions.map((i) => i.candidateId)).size,
  };

  return NextResponse.json({ company, events: eventRows, totals });
}
