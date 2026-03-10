import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const companyId = request.nextUrl.searchParams.get("companyId");

  // If no company selected, return list of all companies that have interactions
  if (!companyId) {
    const companies = await prisma.company.findMany({
      where: { interactions: { some: {} } },
      select: { id: true, name: true, slug: true, batch: true },
      orderBy: { name: "asc" },
    });
    return NextResponse.json({ companies, events: [], totals: null });
  }

  // Get all events where this company has interactions
  const interactions = await prisma.founderInteraction.findMany({
    where: { companyId },
    select: {
      eventId: true,
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

  // Aggregate by event
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
    select: {
      id: true,
      name: true,
      date: true,
      status: true,
      location: true,
      cluster: { select: { id: true, name: true, type: true } },
      _count: { select: { candidates: true } },
    },
    orderBy: { date: "desc" },
  });

  const enriched = events.map((e) => ({
    id: e.id,
    name: e.name,
    date: e.date,
    status: e.status,
    location: e.location,
    cluster: e.cluster,
    candidateCount: e._count.candidates,
    stats: eventMap.get(e.id)!,
  }));

  // Compute totals across all events
  const totals = {
    events: enriched.length,
    contacted: 0, rsvp: 0, attended: 0,
    starred: 0, spoke: 0, followUp: 0,
    interviewed: 0, offered: 0, hired: 0,
  };
  for (const agg of eventMap.values()) {
    totals.contacted += agg.contacted;
    totals.rsvp += agg.rsvp;
    totals.attended += agg.attended;
    totals.starred += agg.starred;
    totals.spoke += agg.spoke;
    totals.followUp += agg.followUp;
    totals.interviewed += agg.interviewed;
    totals.offered += agg.offered;
    totals.hired += agg.hired;
  }

  // Get company info with job count
  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: { id: true, name: true, slug: true, batch: true, _count: { select: { jobs: true } } },
  });

  return NextResponse.json({ company, events: enriched, totals });
}
