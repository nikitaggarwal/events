import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cosineSimilarity } from "@/lib/embeddings";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const applicantId = searchParams.get("applicantId");

  if (!applicantId) {
    return NextResponse.json({ error: "applicantId required" }, { status: 400 });
  }

  const applicant = await prisma.applicant.findUnique({
    where: { id: applicantId },
  });

  if (!applicant) {
    return NextResponse.json({ error: "Applicant not found" }, { status: 404 });
  }

  const events = await prisma.event.findMany({
    where: { status: { in: ["active", "planning"] } },
    include: {
      cluster: {
        include: {
          jobs: {
            include: { company: { select: { id: true, name: true, slug: true, batch: true, description: true, embedding: true } } },
            select: { id: true, title: true, skills: true, company: true, description: true },
          },
          companies: { select: { id: true, name: true, slug: true, batch: true, description: true, embedding: true } },
        },
      },
    },
  });

  const applicantSkillsLower = applicant.skills.map((s) => s.toLowerCase());
  const applicantInterestsLower = (applicant.interests || "").toLowerCase();
  const hasEmbedding = applicant.embedding.length > 0;

  const scoredEvents = events.map((event) => {
    const cluster = event.cluster;
    if (!cluster) return { event, score: 0, companies: [] };

    let keywordScore = 0;
    const clusterKeywords = cluster.keywords.map((k) => k.toLowerCase());
    for (const skill of applicantSkillsLower) {
      if (clusterKeywords.some((kw) => kw.includes(skill) || skill.includes(kw))) {
        keywordScore += 1;
      }
    }
    for (const kw of clusterKeywords) {
      if (applicantInterestsLower.includes(kw)) {
        keywordScore += 0.5;
      }
    }

    const jobSkills = cluster.jobs.flatMap((j) => j.skills.map((s) => s.toLowerCase()));
    for (const skill of applicantSkillsLower) {
      if (jobSkills.some((js) => js.includes(skill) || skill.includes(js))) {
        keywordScore += 0.3;
      }
    }

    const companyMap = new Map<string, { id: string; name: string; slug: string; batch: string | null; description: string | null; score: number; roles: string[]; embedding: number[] }>();

    for (const job of cluster.jobs) {
      const c = job.company;
      if (!companyMap.has(c.id)) {
        companyMap.set(c.id, { ...c, score: 0, roles: [] });
      }
      const entry = companyMap.get(c.id)!;
      entry.roles.push(job.title);

      const jSkills = job.skills.map((s) => s.toLowerCase());
      for (const skill of applicantSkillsLower) {
        if (jSkills.some((js) => js.includes(skill) || skill.includes(js))) {
          entry.score += 1;
        }
      }
    }

    if (cluster.type === "domain") {
      for (const c of cluster.companies) {
        if (!companyMap.has(c.id)) {
          companyMap.set(c.id, { ...c, score: 0, roles: [] });
        }
      }
    }

    if (hasEmbedding) {
      for (const [, company] of companyMap) {
        if (company.embedding.length > 0) {
          const sim = cosineSimilarity(applicant.embedding, company.embedding);
          company.score += sim * 3;
        }
      }
    }

    const companies = Array.from(companyMap.values())
      .sort((a, b) => b.score - a.score)
      .slice(0, 10)
      .map(({ embedding: _, ...c }) => c);

    const score = keywordScore + (companies.length > 0 ? companies[0].score * 0.5 : 0);

    return { event, score, companies };
  });

  const sorted = scoredEvents
    .filter((e) => e.score > 0 || e.companies.length > 0)
    .sort((a, b) => b.score - a.score);

  // If no good matches, return all events
  const results = sorted.length > 0 ? sorted : scoredEvents;

  return NextResponse.json(
    results.map((r) => ({
      event: {
        id: r.event.id,
        name: r.event.name,
        date: r.event.date,
        location: r.event.location,
        status: r.event.status,
        description: r.event.description,
        cluster: r.event.cluster
          ? { id: r.event.cluster.id, name: r.event.cluster.name, keywords: r.event.cluster.keywords }
          : null,
      },
      score: Math.round(r.score * 100) / 100,
      companies: r.companies,
    }))
  );
}
