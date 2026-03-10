import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import OpenAI from "openai";
import Exa from "exa-js";

export const maxDuration = 300;

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const exa = new Exa(process.env.EXA_API_KEY);
const BATCH = 10;

async function parseExperience(
  name: string,
  fullText: string | null,
  title: string | null,
  company: string | null,
  highlights: string | null
): Promise<{ current: { title: string; company: string; years: string } | null; previous: { title: string; company: string; years: string } | null }> {
  const profileText = fullText || highlights;
  const text = [
    name,
    title ? `Title: ${title}` : "",
    company ? `Company: ${company}` : "",
    profileText ? `Profile:\n${profileText.substring(0, 2500)}` : "",
  ].filter(Boolean).join("\n");

  const res = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: `Extract work experience from a LinkedIn profile. Return JSON with "current" and "previous" fields.
Each should be { "title": "...", "company": "...", "years": "..." } or null if not found.
- "title" = job title (e.g. "Staff SRE", "Engineering Manager", "Founder")
- "company" = company name only (e.g. "Stripe", "Google")
- "years" = approximate tenure (e.g. "2021–Present", "2018–2021", "3 years"). Use "–Present" for current roles.
Look for the "Experience" section which lists actual job positions with companies and dates.
Do NOT use the headline/bio/summary as a job position — those describe the person, not a specific role.
If you can only find the current role, set previous to null.
Only return valid JSON, no markdown.`,
      },
      { role: "user", content: text },
    ],
    temperature: 0,
  });

  try {
    return JSON.parse(res.choices[0].message.content || "{}");
  } catch {
    return { current: null, previous: null };
  }
}

export async function POST(request: Request) {
  const { refetch } = await request.json().catch(() => ({ refetch: false }));

  // Step 1: If refetch=true, fetch full text from Exa for candidates missing fullText
  if (refetch) {
    const needText = await prisma.candidate.findMany({
      where: {
        fullText: null,
        profileUrl: { not: null },
      },
      select: { id: true, profileUrl: true },
    });

    if (needText.length > 0) {
      const urlBatch = 50;
      for (let i = 0; i < needText.length; i += urlBatch) {
        const batch = needText.slice(i, i + urlBatch);
        const urls = batch.map((c) => c.profileUrl!).filter(Boolean);

        try {
          const results = await exa.getContents(urls, {
            text: { maxCharacters: 3000 },
          });

          const urlToText = new Map<string, string>();
          for (const r of results.results) {
            if (r.text) urlToText.set(r.url, r.text);
          }

          await Promise.all(
            batch.map((c) => {
              const text = urlToText.get(c.profileUrl!);
              if (text) {
                return prisma.candidate.update({
                  where: { id: c.id },
                  data: { fullText: text },
                });
              }
              return Promise.resolve();
            })
          );
        } catch (e) {
          console.error("Exa getContents batch error:", e);
        }
      }
    }
  }

  // Step 2: Re-enrich all candidates (or only those without experience)
  const where = refetch
    ? {}
    : { experience: { equals: Prisma.DbNull } };

  const candidates = await prisma.candidate.findMany({
    where,
    select: { id: true, name: true, title: true, company: true, highlights: true, fullText: true },
  });

  if (candidates.length === 0) {
    return NextResponse.json({ message: "All candidates already enriched", enriched: 0 });
  }

  let enriched = 0;

  for (let i = 0; i < candidates.length; i += BATCH) {
    const batch = candidates.slice(i, i + BATCH);
    const results = await Promise.all(
      batch.map((c) => parseExperience(c.name, c.fullText, c.title, c.company, c.highlights))
    );

    await Promise.all(
      batch.map((c, idx) =>
        prisma.candidate.update({
          where: { id: c.id },
          data: { experience: results[idx] as object },
        })
      )
    );

    enriched += batch.length;
  }

  return NextResponse.json({ message: `Enriched ${enriched} candidates`, enriched });
}
