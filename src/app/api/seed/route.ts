import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sourceCandidatesForCluster } from "@/lib/exa";

export const maxDuration = 300;

const EVENTS_TO_CREATE = [
  // Completed past events
  { name: "Infrastructure & DevTools Hiring Night", status: "completed", daysAgo: 45, clusterType: "role", clusterKeyword: "Infrastructure" },
  { name: "AI/ML Engineers Meetup", status: "completed", daysAgo: 30, clusterType: "role", clusterKeyword: "Applied AI" },
  { name: "FinTech Founders × Candidates", status: "completed", daysAgo: 20, clusterType: "domain", clusterKeyword: "Financial" },
  // Active events
  { name: "Full-Stack Engineering Hiring Fair", status: "active", daysAgo: -5, clusterType: "role", clusterKeyword: "Full-Stack Engineering" },
  { name: "Growth & Marketing Mixer", status: "active", daysAgo: -3, clusterType: "role", clusterKeyword: "Growth Marketing" },
  { name: "Healthcare & Biotech Hiring Night", status: "active", daysAgo: -7, clusterType: "domain", clusterKeyword: "Health" },
  // Planning events
  { name: "Enterprise Sales Speed Dating", status: "planning", daysAgo: -14, clusterType: "role", clusterKeyword: "Enterprise Sales" },
  { name: "DevTools Demo Day + Hiring", status: "planning", daysAgo: -21, clusterType: "domain", clusterKeyword: "Developer Tools" },
  { name: "Robotics & Autonomy Showcase", status: "planning", daysAgo: -18, clusterType: "domain", clusterKeyword: "Robotics" },
  // Drafts
  { name: "AI Product Builders Night", status: "draft", daysAgo: -28, clusterType: "role", clusterKeyword: "AI Product" },
  { name: "Compliance & RegTech Hiring Hour", status: "draft", daysAgo: -35, clusterType: "domain", clusterKeyword: "Compliance" },
  { name: "Operations & Logistics Meetup", status: "draft", daysAgo: -25, clusterType: "role", clusterKeyword: "Operations" },
];

export async function POST() {
  const results: string[] = [];

  const [roleClusters, domainClusters] = await Promise.all([
    prisma.cluster.findMany({ where: { type: "role" }, select: { id: true, name: true, keywords: true, jobs: { select: { title: true }, take: 10 } } }),
    prisma.cluster.findMany({ where: { type: "domain" }, select: { id: true, name: true, keywords: true, companies: { select: { id: true, jobs: { select: { title: true }, take: 5 } }, take: 10 } } }),
  ]);

  for (const spec of EVENTS_TO_CREATE) {
    const existing = await prisma.event.findFirst({ where: { name: spec.name } });
    if (existing) {
      results.push(`SKIP: "${spec.name}" already exists`);
      continue;
    }

    let cluster;
    if (spec.clusterType === "role") {
      cluster = roleClusters.find((c) => c.name.includes(spec.clusterKeyword));
    } else {
      cluster = domainClusters.find((c) => c.name.includes(spec.clusterKeyword));
    }

    if (!cluster) {
      results.push(`SKIP: No cluster matching "${spec.clusterKeyword}"`);
      continue;
    }

    const eventDate = new Date();
    eventDate.setDate(eventDate.getDate() - spec.daysAgo);

    const event = await prisma.event.create({
      data: {
        name: spec.name,
        status: spec.status,
        date: eventDate,
        location: "YC Campus, Dogpatch SF",
        clusterId: cluster.id,
      },
    });

    results.push(`CREATED: "${spec.name}" (${spec.status}) → cluster "${cluster.name}"`);

    // Source candidates via Exa for completed and active events
    if (spec.status === "completed" || spec.status === "active") {
      try {
        const jobTitles = spec.clusterType === "role"
          ? (cluster as typeof roleClusters[0]).jobs.map((j) => j.title)
          : (cluster as typeof domainClusters[0]).companies.flatMap((c) => c.jobs.map((j) => j.title));

        const sourced = await sourceCandidatesForCluster(
          cluster.name,
          cluster.keywords,
          jobTitles
        );

        if (sourced.length > 0) {
          await prisma.candidate.createMany({
            data: sourced.map((s) => ({
              name: s.name,
              title: s.title,
              company: s.company,
              location: s.location,
              profileUrl: s.profileUrl,
              highlights: s.highlights,
              source: s.source,
              fitScore: Math.random() * 0.4 + 0.6,
              eventId: event.id,
            })),
          });
          results.push(`  SOURCED: ${sourced.length} candidates`);
        }
      } catch (err) {
        results.push(`  EXA ERROR: ${err}`);
      }
    }

    // Add founder interactions for completed events
    if (spec.status === "completed" || spec.status === "active") {
      const candidates = await prisma.candidate.findMany({
        where: { eventId: event.id },
        select: { id: true },
      });

      let companies: { id: string }[] = [];
      if (spec.clusterType === "domain") {
        companies = await prisma.company.findMany({
          where: { domainClusterId: cluster.id },
          select: { id: true },
          take: 8,
        });
      } else {
        const jobs = await prisma.job.findMany({
          where: { clusterId: cluster.id },
          select: { company: { select: { id: true } } },
          distinct: ["companyId"],
          take: 8,
        });
        companies = jobs.map((j) => j.company);
      }

      if (candidates.length > 0 && companies.length > 0) {
        const interactions: {
          candidateId: string;
          companyId: string;
          eventId: string;
          starred: boolean;
          spoke: boolean;
          followUp: boolean;
          rating: number | null;
          notes: string | null;
        }[] = [];

        for (const company of companies.slice(0, 5)) {
          const shuffled = [...candidates].sort(() => Math.random() - 0.5);
          const numToStar = Math.floor(Math.random() * 4) + 2;
          const numSpoke = spec.status === "completed" ? Math.floor(Math.random() * 3) + 1 : 0;

          for (let i = 0; i < Math.min(shuffled.length, numToStar + 3); i++) {
            const starred = i < numToStar;
            const spoke = spec.status === "completed" && i < numSpoke;
            const followUp = spoke && Math.random() > 0.5;
            const notes = spoke
              ? ["Great technical depth, would be a strong IC hire.", "Good culture fit, interested in our mission.", "Very experienced, might be overqualified.", "Strong communicator, wants to lead a team.", "Impressive projects, scheduling follow-up."][Math.floor(Math.random() * 5)]
              : null;
            const rating = spoke ? Math.floor(Math.random() * 3) + 3 : null;

            interactions.push({
              candidateId: shuffled[i].id,
              companyId: company.id,
              eventId: event.id,
              starred,
              spoke,
              followUp,
              rating,
              notes,
            });
          }
        }

        if (interactions.length > 0) {
          await prisma.founderInteraction.createMany({ data: interactions, skipDuplicates: true });
          results.push(`  INTERACTIONS: ${interactions.length} (across ${Math.min(companies.length, 5)} companies)`);
        }
      }
    }
  }

  return NextResponse.json({ results });
}
