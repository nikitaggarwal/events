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
        },
      },
      candidates: { orderBy: { fitScore: "desc" } },
    },
  });

  if (!event) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }

  return NextResponse.json(event, {
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
