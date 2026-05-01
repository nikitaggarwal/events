import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getEmbedding } from "@/lib/embeddings";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const email = searchParams.get("email");

  if (email) {
    const applicant = await prisma.applicant.findUnique({
      where: { email },
      include: {
        companyInterests: { include: { company: true, event: true } },
        matches: {
          include: {
            company: true,
            event: true,
            messages: { orderBy: { createdAt: "desc" }, take: 1 },
          },
        },
      },
    });
    if (!applicant) {
      return NextResponse.json(null);
    }
    return NextResponse.json(applicant);
  }

  const applicants = await prisma.applicant.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      companyInterests: { select: { companyId: true, eventId: true } },
      matches: { select: { id: true, companyId: true, eventId: true } },
    },
  });
  return NextResponse.json(applicants);
}

export async function POST(request: Request) {
  const body = await request.json();
  const { name, email, linkedinUrl, resumeUrl, skills, interests } = body;

  if (!name || !email) {
    return NextResponse.json({ error: "Name and email required" }, { status: 400 });
  }

  const profileText = [
    `Name: ${name}`,
    skills?.length ? `Skills: ${skills.join(", ")}` : "",
    interests ? `Interests: ${interests}` : "",
  ]
    .filter(Boolean)
    .join(". ");

  let embedding: number[] = [];
  try {
    embedding = await getEmbedding(profileText);
  } catch {
    // embedding is optional — matching will still work via keywords
  }

  const applicant = await prisma.applicant.upsert({
    where: { email },
    update: {
      name,
      linkedinUrl: linkedinUrl || null,
      resumeUrl: resumeUrl || null,
      skills: skills || [],
      interests: interests || null,
      ...(embedding.length > 0 ? { embedding } : {}),
    },
    create: {
      name,
      email,
      linkedinUrl: linkedinUrl || null,
      resumeUrl: resumeUrl || null,
      skills: skills || [],
      interests: interests || null,
      embedding,
    },
  });

  return NextResponse.json(applicant);
}
