import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const eventId = searchParams.get("eventId");
  const applicantId = searchParams.get("applicantId");

  if (eventId) {
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      include: {
        cluster: {
          include: {
            jobs: {
              include: { company: { select: { id: true, name: true, slug: true, batch: true, description: true, url: true } } },
            },
            companies: { select: { id: true, name: true, slug: true, batch: true, description: true, url: true } },
          },
        },
      },
    });

    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    const companyMap = new Map<string, {
      id: string;
      name: string;
      slug: string;
      batch: string | null;
      description: string | null;
      url: string | null;
      roles: { id: string; title: string; skills: string[] }[];
    }>();

    if (event.cluster) {
      for (const job of event.cluster.jobs) {
        const c = job.company;
        if (!companyMap.has(c.id)) {
          companyMap.set(c.id, { ...c, roles: [] });
        }
        companyMap.get(c.id)!.roles.push({
          id: job.id,
          title: job.title,
          skills: job.skills,
        });
      }

      if (event.cluster.type === "domain") {
        for (const c of event.cluster.companies) {
          if (!companyMap.has(c.id)) {
            companyMap.set(c.id, { ...c, roles: [] });
          }
        }
      }
    }

    let myInterests: Set<string> = new Set();
    let founderInterests: Set<string> = new Set();

    if (applicantId) {
      const [appInterests, fInterests] = await Promise.all([
        prisma.applicantCompanyInterest.findMany({
          where: { applicantId, eventId },
          select: { companyId: true },
        }),
        prisma.founderApplicantInterest.findMany({
          where: { applicantId, eventId },
          select: { companyId: true },
        }),
      ]);
      myInterests = new Set(appInterests.map((i) => i.companyId));
      founderInterests = new Set(fInterests.map((i) => i.companyId));
    }

    const companies = Array.from(companyMap.values()).map((c) => ({
      ...c,
      interested: myInterests.has(c.id),
      founderInterested: founderInterests.has(c.id),
      matched: myInterests.has(c.id) && founderInterests.has(c.id),
    }));

    return NextResponse.json({
      event: {
        id: event.id,
        name: event.name,
        date: event.date,
        location: event.location,
        status: event.status,
        description: event.description,
        cluster: event.cluster
          ? { id: event.cluster.id, name: event.cluster.name, keywords: event.cluster.keywords, type: event.cluster.type }
          : null,
      },
      companies,
    });
  }

  // List upcoming events
  const events = await prisma.event.findMany({
    where: { status: { in: ["active", "planning"] } },
    include: {
      cluster: { select: { id: true, name: true, keywords: true, type: true } },
      _count: { select: { candidates: true } },
    },
    orderBy: { date: "asc" },
  });

  return NextResponse.json(events);
}
