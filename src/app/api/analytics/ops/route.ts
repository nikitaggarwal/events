import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const events = await prisma.event.findMany({
    where: { candidates: { some: {} } },
    select: {
      id: true,
      name: true,
      date: true,
      status: true,
      cluster: { select: { name: true, type: true } },
      _count: { select: { candidates: true } },
    },
    orderBy: { date: "desc" },
  });

  const eventIds = events.map((e) => e.id);

  // Per-event interaction aggregates
  const perEvent: {
    eventId: string;
    contacted: bigint; rsvp: bigint; attended: bigint;
    starred: bigint; spoke: bigint; followUp: bigint;
    interviewed: bigint; offered: bigint; hired: bigint;
    companies: bigint;
  }[] = eventIds.length > 0
    ? await prisma.$queryRaw`
        SELECT "eventId",
          COUNT(*) FILTER (WHERE "contacted") as contacted,
          COUNT(*) FILTER (WHERE "rsvp") as rsvp,
          COUNT(*) FILTER (WHERE "attended") as attended,
          COUNT(*) FILTER (WHERE "starred") as starred,
          COUNT(*) FILTER (WHERE "spoke") as spoke,
          COUNT(*) FILTER (WHERE "followUp") as "followUp",
          COUNT(*) FILTER (WHERE "interviewed") as interviewed,
          COUNT(*) FILTER (WHERE "offered") as offered,
          COUNT(*) FILTER (WHERE "hired") as hired,
          COUNT(DISTINCT "companyId") as companies
        FROM "FounderInteraction"
        WHERE "eventId" = ANY(${eventIds})
        GROUP BY "eventId"
      `
    : [];

  const aggMap = new Map(perEvent.map((a) => [a.eventId, a]));

  const eventRows = events.map((e) => {
    const a = aggMap.get(e.id);
    const n = (v: bigint | undefined) => Number(v ?? 0);
    const sourced = e._count.candidates;
    const contacted = n(a?.contacted);
    const rsvp = n(a?.rsvp);
    const attended = n(a?.attended);
    const starred = n(a?.starred);
    const spoke = n(a?.spoke);
    const followUp = n(a?.followUp);
    const interviewed = n(a?.interviewed);
    const offered = n(a?.offered);
    const hired = n(a?.hired);

    return {
      id: e.id,
      name: e.name,
      date: e.date,
      status: e.status,
      clusterName: e.cluster?.name || null,
      clusterType: e.cluster?.type || null,
      companies: n(a?.companies),
      sourced,
      contacted,
      rsvp,
      attended,
      starred,
      spoke,
      followUp,
      interviewed,
      offered,
      hired,
      // Conversion rates
      contactRate: sourced > 0 ? contacted / sourced : 0,
      rsvpRate: contacted > 0 ? rsvp / contacted : 0,
      attendRate: rsvp > 0 ? attended / rsvp : 0,
      interviewRate: spoke > 0 ? interviewed / spoke : 0,
      offerRate: interviewed > 0 ? offered / interviewed : 0,
      hireRate: offered > 0 ? hired / offered : 0,
      overallConversion: sourced > 0 ? hired / sourced : 0,
    };
  });

  // Aggregate totals
  const totals = eventRows.reduce(
    (acc, e) => ({
      events: acc.events + 1,
      sourced: acc.sourced + e.sourced,
      contacted: acc.contacted + e.contacted,
      rsvp: acc.rsvp + e.rsvp,
      attended: acc.attended + e.attended,
      starred: acc.starred + e.starred,
      spoke: acc.spoke + e.spoke,
      followUp: acc.followUp + e.followUp,
      interviewed: acc.interviewed + e.interviewed,
      offered: acc.offered + e.offered,
      hired: acc.hired + e.hired,
      companies: acc.companies + e.companies,
    }),
    { events: 0, sourced: 0, contacted: 0, rsvp: 0, attended: 0, starred: 0, spoke: 0, followUp: 0, interviewed: 0, offered: 0, hired: 0, companies: 0 }
  );

  // Top companies by hires
  const topCompanies: { companyId: string; name: string; hired: bigint; interviewed: bigint; spoke: bigint }[] =
    eventIds.length > 0
      ? await prisma.$queryRaw`
          SELECT fi."companyId", c."name",
            COUNT(*) FILTER (WHERE fi."hired") as hired,
            COUNT(*) FILTER (WHERE fi."interviewed") as interviewed,
            COUNT(*) FILTER (WHERE fi."spoke") as spoke
          FROM "FounderInteraction" fi
          JOIN "Company" c ON c.id = fi."companyId"
          WHERE fi."eventId" = ANY(${eventIds})
          GROUP BY fi."companyId", c."name"
          ORDER BY hired DESC, interviewed DESC
          LIMIT 10
        `
      : [];

  return NextResponse.json({
    events: eventRows,
    totals,
    topCompanies: topCompanies.map((c) => ({
      id: c.companyId,
      name: c.name,
      hired: Number(c.hired),
      interviewed: Number(c.interviewed),
      spoke: Number(c.spoke),
    })),
  });
}
