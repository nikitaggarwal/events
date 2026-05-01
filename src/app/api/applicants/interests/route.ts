import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  const { applicantId, companyId, eventId } = await request.json();

  if (!applicantId || !companyId || !eventId) {
    return NextResponse.json(
      { error: "applicantId, companyId, eventId required" },
      { status: 400 }
    );
  }

  const existing = await prisma.applicantCompanyInterest.findUnique({
    where: { applicantId_companyId_eventId: { applicantId, companyId, eventId } },
  });

  if (existing) {
    await prisma.applicantCompanyInterest.delete({ where: { id: existing.id } });
    return NextResponse.json({ interested: false });
  }

  await prisma.applicantCompanyInterest.create({
    data: { applicantId, companyId, eventId },
  });

  // Check for mutual interest → create match
  const founderInterest = await prisma.founderApplicantInterest.findUnique({
    where: { applicantId_companyId_eventId: { applicantId, companyId, eventId } },
  });

  if (founderInterest) {
    await prisma.match.upsert({
      where: { applicantId_companyId_eventId: { applicantId, companyId, eventId } },
      update: { status: "active" },
      create: { applicantId, companyId, eventId },
    });
    return NextResponse.json({ interested: true, matched: true });
  }

  return NextResponse.json({ interested: true, matched: false });
}
