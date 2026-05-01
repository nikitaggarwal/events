import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const companyId = searchParams.get("companyId");
  const eventId = searchParams.get("eventId");

  if (!companyId || !eventId) {
    return NextResponse.json({ error: "companyId and eventId required" }, { status: 400 });
  }

  // Find applicants who expressed interest in this company for this event
  const interests = await prisma.applicantCompanyInterest.findMany({
    where: { companyId, eventId },
    include: {
      applicant: {
        select: { id: true, name: true, email: true, skills: true, interests: true, linkedinUrl: true },
      },
    },
  });

  // Check which ones the founder has also expressed interest in
  const founderInterests = await prisma.founderApplicantInterest.findMany({
    where: { companyId, eventId },
    select: { applicantId: true },
  });
  const founderInterestedSet = new Set(founderInterests.map((fi) => fi.applicantId));

  // Check for existing matches
  const existingMatches = await prisma.match.findMany({
    where: { companyId, eventId },
    select: { applicantId: true },
  });
  const matchedSet = new Set(existingMatches.map((m) => m.applicantId));

  const result = interests.map((i) => ({
    ...i.applicant,
    founderInterested: founderInterestedSet.has(i.applicant.id),
    matched: matchedSet.has(i.applicant.id),
  }));

  return NextResponse.json(result);
}
