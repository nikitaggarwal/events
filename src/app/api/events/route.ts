import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const events = await prisma.event.findMany({
    include: {
      cluster: { select: { id: true, name: true } },
      candidates: { select: { id: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const eventIds = events.map((e) => e.id);

  const aggs: { eventId: string; contacted: bigint; rsvp: bigint; attended: bigint; starred: bigint; spoke: bigint; followUp: bigint; interviewed: bigint; offered: bigint; hired: bigint }[] =
    eventIds.length > 0
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
            COUNT(*) FILTER (WHERE "hired") as hired
          FROM "FounderInteraction"
          WHERE "eventId" = ANY(${eventIds})
          GROUP BY "eventId"
        `
      : [];

  const aggMap = new Map(aggs.map((a) => [a.eventId, a]));

  const result = events.map((e) => {
    const a = aggMap.get(e.id);
    return {
      ...e,
      interactionStats: {
        contacted: Number(a?.contacted ?? 0),
        rsvp: Number(a?.rsvp ?? 0),
        attended: Number(a?.attended ?? 0),
        starred: Number(a?.starred ?? 0),
        spoke: Number(a?.spoke ?? 0),
        followUp: Number(a?.followUp ?? 0),
        interviewed: Number(a?.interviewed ?? 0),
        offered: Number(a?.offered ?? 0),
        hired: Number(a?.hired ?? 0),
      },
    };
  });

  return NextResponse.json(result, {
    headers: { "Cache-Control": "s-maxage=30, stale-while-revalidate=120" },
  });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const event = await prisma.event.create({
      data: {
        name: body.name,
        date: body.date ? new Date(body.date) : null,
        location: body.location || "YC Campus, Dogpatch SF",
        description: body.description,
        clusterId: body.clusterId || null,
        status: body.status || "draft",
      },
      include: { cluster: true },
    });

    return NextResponse.json(event);
  } catch (error) {
    console.error("Create event error:", error);
    return NextResponse.json(
      { error: "Failed to create event", details: String(error) },
      { status: 500 }
    );
  }
}
