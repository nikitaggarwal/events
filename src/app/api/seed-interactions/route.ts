import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const maxDuration = 60;

const NOTES_POOL = [
  "Great technical depth, would be a strong IC hire.",
  "Good culture fit, interested in our mission.",
  "Very experienced, might be overqualified.",
  "Strong communicator, wants to lead a team.",
  "Impressive projects, scheduling follow-up.",
  "Deep domain expertise, perfect for the role.",
  "Asked great questions about our architecture.",
  "Referred by another candidate at the event.",
  "Wants remote — checking with team.",
  "Will send take-home assessment this week.",
  "Has startup experience, good founding-team energy.",
  "Strong references from shared connections.",
];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export async function POST() {
  await prisma.founderInteraction.deleteMany({});

  const events = await prisma.event.findMany({
    where: { candidates: { some: {} } },
    select: {
      id: true,
      name: true,
      status: true,
      clusterId: true,
      cluster: { select: { id: true, type: true } },
    },
  });

  const results: string[] = [];

  for (const event of events) {
    if (!event.clusterId) continue;

    const candidates = await prisma.candidate.findMany({
      where: { eventId: event.id },
      select: { id: true },
    });

    let companyIds: string[] = [];
    if (event.cluster?.type === "domain") {
      const companies = await prisma.company.findMany({
        where: { domainClusterId: event.clusterId },
        select: { id: true },
        take: 8,
      });
      companyIds = companies.map((c) => c.id);
    } else {
      const jobs = await prisma.job.findMany({
        where: { clusterId: event.clusterId },
        select: { companyId: true },
        distinct: ["companyId"],
        take: 8,
      });
      companyIds = jobs.map((j) => j.companyId);
    }

    if (candidates.length === 0 || companyIds.length === 0) continue;

    const isCompleted = event.status === "completed";
    const isActive = event.status === "active";

    const interactions: {
      candidateId: string;
      companyId: string;
      eventId: string;
      contacted: boolean;
      rsvp: boolean;
      attended: boolean;
      starred: boolean;
      spoke: boolean;
      followUp: boolean;
      interviewed: boolean;
      offered: boolean;
      hired: boolean;
      rating: number | null;
      notes: string | null;
    }[] = [];

    for (const companyId of companyIds.slice(0, 6)) {
      const shuffled = [...candidates].sort(() => Math.random() - 0.5);
      const total = Math.min(shuffled.length, Math.floor(Math.random() * 5) + 8);

      let hiredOne = false;

      for (let i = 0; i < total; i++) {
        // Pre-event: contacted → rsvp → attended (funnel narrows)
        const contacted = Math.random() > 0.1; // ~90%
        const rsvp = contacted && Math.random() > 0.2; // ~72% of total
        const attended = rsvp && (isCompleted || isActive) && Math.random() > 0.15; // ~61%

        // At event
        const starred = attended && Math.random() > 0.2; // ~49%
        const spoke = (isCompleted || isActive) && starred && Math.random() > 0.15; // ~42%
        const followUp = spoke && Math.random() > 0.25; // ~31%
        const notes = spoke ? pick(NOTES_POOL) : null;
        const rating = spoke ? Math.floor(Math.random() * 3) + 3 : null;

        // Post-event: higher conversion rates, guarantee at least 1 hire per company
        const interviewed = isCompleted && followUp && Math.random() > 0.15; // ~26%
        const offered = interviewed && Math.random() > 0.35; // ~17%
        let hired = offered && Math.random() > 0.3; // ~12%

        // Guarantee at least 1 hire per company for completed events
        if (isCompleted && !hiredOne && i === total - 1 && !hired) {
          hired = true;
        }
        if (hired) hiredOne = true;

        interactions.push({
          candidateId: shuffled[i].id,
          companyId,
          eventId: event.id,
          contacted,
          rsvp,
          attended,
          starred,
          spoke,
          followUp,
          interviewed,
          offered,
          hired,
          rating,
          notes,
        });
      }
    }

    if (interactions.length > 0) {
      await prisma.founderInteraction.createMany({ data: interactions, skipDuplicates: true });
      const s = {
        contacted: interactions.filter((i) => i.contacted).length,
        rsvp: interactions.filter((i) => i.rsvp).length,
        attended: interactions.filter((i) => i.attended).length,
        starred: interactions.filter((i) => i.starred).length,
        spoke: interactions.filter((i) => i.spoke).length,
        followUp: interactions.filter((i) => i.followUp).length,
        interviewed: interactions.filter((i) => i.interviewed).length,
        offered: interactions.filter((i) => i.offered).length,
        hired: interactions.filter((i) => i.hired).length,
      };
      results.push(`${event.name} (${interactions.length}): contacted=${s.contacted} rsvp=${s.rsvp} attended=${s.attended} ★=${s.starred} spoke=${s.spoke} follow=${s.followUp} interview=${s.interviewed} offer=${s.offered} hired=${s.hired}`);
    }
  }

  return NextResponse.json({ results });
}
