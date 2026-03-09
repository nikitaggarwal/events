import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const events = await prisma.event.findMany({
    include: {
      cluster: { select: { id: true, name: true } },
      candidates: { select: { id: true, inviteStatus: true } },
    },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(events, {
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
