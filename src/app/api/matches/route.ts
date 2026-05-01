import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const applicantId = searchParams.get("applicantId");
  const companyId = searchParams.get("companyId");

  const where: Record<string, string> = {};
  if (applicantId) where.applicantId = applicantId;
  if (companyId) where.companyId = companyId;

  const matches = await prisma.match.findMany({
    where,
    include: {
      applicant: { select: { id: true, name: true, email: true, skills: true, interests: true, linkedinUrl: true } },
      company: { select: { id: true, name: true, slug: true, batch: true } },
      event: { select: { id: true, name: true, date: true } },
      messages: { orderBy: { createdAt: "desc" }, take: 1 },
    },
    orderBy: { updatedAt: "desc" },
  });

  return NextResponse.json(matches);
}
