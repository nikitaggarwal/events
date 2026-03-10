import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sourceCandidatesForCluster } from "@/lib/exa";
import OpenAI from "openai";

export const maxDuration = 300;

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function enrichExperience(candidates: { id: string; name: string; title: string | null; company: string | null; highlights: string | null; fullText: string | null }[]) {
  const BATCH = 10;
  for (let i = 0; i < candidates.length; i += BATCH) {
    const batch = candidates.slice(i, i + BATCH);
    const results = await Promise.all(
      batch.map(async (c) => {
        const profileText = c.fullText || c.highlights;
        const text = [c.name, c.title ? `Title: ${c.title}` : "", c.company ? `Company: ${c.company}` : "", profileText ? `Profile:\n${profileText.substring(0, 2500)}` : ""].filter(Boolean).join("\n");
        try {
          const res = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
              { role: "system", content: `Extract work experience from a LinkedIn profile. Return JSON with "current" and "previous" fields. Each should be { "title": "...", "company": "...", "years": "..." } or null if not found. Look for the "Experience" section which lists actual job positions. Do NOT use the bio/headline as a job. Only return valid JSON, no markdown.` },
              { role: "user", content: text },
            ],
            temperature: 0,
          });
          return JSON.parse(res.choices[0].message.content || "{}");
        } catch { return { current: null, previous: null }; }
      })
    );
    await Promise.all(
      batch.map((c, idx) => prisma.candidate.update({ where: { id: c.id }, data: { experience: results[idx] as object } }))
    );
  }
}

export async function POST(request: Request) {
  try {
    const { clusterId, eventId } = await request.json();

    if (!clusterId) {
      return NextResponse.json(
        { error: "clusterId is required" },
        { status: 400 }
      );
    }

    const cluster = await prisma.cluster.findUnique({
      where: { id: clusterId },
      include: { jobs: true },
    });

    if (!cluster) {
      return NextResponse.json(
        { error: "Cluster not found" },
        { status: 404 }
      );
    }

    const jobTitles = cluster.jobs.map((j) => j.title);

    const sourced = await sourceCandidatesForCluster(
      cluster.name,
      cluster.keywords,
      jobTitles
    );

    const data = sourced.map((s) => ({
      name: s.name,
      title: s.title,
      company: s.company,
      location: s.location,
      profileUrl: s.profileUrl,
      highlights: s.highlights,
      fullText: s.fullText,
      source: s.source,
      eventId: eventId || null,
    }));

    await prisma.candidate.createMany({ data });

    const candidates = await prisma.candidate.findMany({
      where: { eventId: eventId || undefined },
      orderBy: { createdAt: "desc" },
      take: data.length,
    });

    // Enrich experience in the background (non-blocking for response)
    enrichExperience(candidates.map((c) => ({ id: c.id, name: c.name, title: c.title, company: c.company, highlights: c.highlights, fullText: c.fullText }))).catch(console.error);

    return NextResponse.json({
      success: true,
      count: candidates.length,
      candidates,
    });
  } catch (error) {
    console.error("Source error:", error);
    return NextResponse.json(
      { error: "Sourcing failed", details: String(error) },
      { status: 500 }
    );
  }
}
