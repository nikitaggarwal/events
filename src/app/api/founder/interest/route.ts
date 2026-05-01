import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const companyId = searchParams.get("companyId");
  const eventId = searchParams.get("eventId");

  if (!companyId) {
    return NextResponse.json({ error: "companyId required" }, { status: 400 });
  }

  const where: { companyId: string; eventId?: string } = { companyId };
  if (eventId) where.eventId = eventId;

  const interests = await prisma.founderApplicantInterest.findMany({
    where,
    include: {
      applicant: { select: { id: true, name: true, email: true, skills: true, interests: true, linkedinUrl: true } },
      event: { select: { id: true, name: true } },
    },
  });

  return NextResponse.json(interests);
}

export async function POST(request: Request) {
  const { applicantId, companyId, eventId } = await request.json();

  if (!applicantId || !companyId || !eventId) {
    return NextResponse.json(
      { error: "applicantId, companyId, eventId required" },
      { status: 400 }
    );
  }

  const existing = await prisma.founderApplicantInterest.findUnique({
    where: { applicantId_companyId_eventId: { applicantId, companyId, eventId } },
  });

  if (existing) {
    await prisma.founderApplicantInterest.delete({ where: { id: existing.id } });
    return NextResponse.json({ interested: false });
  }

  await prisma.founderApplicantInterest.create({
    data: { applicantId, companyId, eventId },
  });

  // Check for mutual interest → create match
  const applicantInterest = await prisma.applicantCompanyInterest.findUnique({
    where: { applicantId_companyId_eventId: { applicantId, companyId, eventId } },
  });

  if (applicantInterest) {
    await prisma.match.upsert({
      where: { applicantId_companyId_eventId: { applicantId, companyId, eventId } },
      update: { status: "active" },
      create: { applicantId, companyId, eventId },
    });
    return NextResponse.json({ interested: true, matched: true });
  }

  return NextResponse.json({ interested: true, matched: false });
}
