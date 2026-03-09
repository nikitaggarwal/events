import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const eventId = request.nextUrl.searchParams.get("eventId");
  if (!eventId) {
    return NextResponse.json({ error: "eventId required" }, { status: 400 });
  }

  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: {
      id: true,
      name: true,
      date: true,
      location: true,
      clusterId: true,
      cluster: { select: { id: true, name: true, type: true } },
    },
  });

  if (!event) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }

  let companies: { id: string; name: string; slug: string; batch: string | null }[] = [];

  if (event.cluster) {
    if (event.cluster.type === "domain") {
      companies = await prisma.company.findMany({
        where: { domainClusterId: event.cluster.id },
        select: { id: true, name: true, slug: true, batch: true },
        orderBy: { name: "asc" },
      });
    } else {
      const jobs = await prisma.job.findMany({
        where: { clusterId: event.cluster.id },
        select: { company: { select: { id: true, name: true, slug: true, batch: true } } },
        distinct: ["companyId"],
      });
      companies = jobs.map((j) => j.company);
    }
  }

  return NextResponse.json({
    id: event.id,
    name: event.name,
    date: event.date,
    location: event.location,
    cluster: event.cluster,
    companies,
  });
}
