import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const STAGES = [
  "contacted",
  "rsvp",
  "attended",
  "starred",
  "spoke",
  "followUp",
  "interviewed",
  "offered",
  "hired",
] as const;

type Stage = (typeof STAGES)[number];

function isStage(s: string): s is Stage {
  return (STAGES as readonly string[]).includes(s);
}

export async function GET(request: NextRequest) {
  const companyId = request.nextUrl.searchParams.get("companyId");
  const stage = request.nextUrl.searchParams.get("stage");

  if (!companyId || !stage || !isStage(stage)) {
    return NextResponse.json(
      { error: "companyId and stage (contacted|rsvp|attended|starred|spoke|followUp|interviewed|offered|hired) required" },
      { status: 400 },
    );
  }

  const rows = await prisma.founderInteraction.findMany({
    where: { companyId, [stage]: true },
    include: {
      candidate: {
        select: {
          id: true,
          name: true,
          title: true,
          company: true,
          highlights: true,
          linkedinUrl: true,
        },
      },
      event: { select: { id: true, name: true, date: true, status: true } },
    },
    orderBy: { updatedAt: "desc" },
    take: 500,
  });

  return NextResponse.json({
    stage,
    rows: rows.map((r) => ({
      interactionId: r.id,
      candidate: r.candidate,
      event: r.event,
      flags: {
        contacted: r.contacted,
        rsvp: r.rsvp,
        attended: r.attended,
        starred: r.starred,
        spoke: r.spoke,
        followUp: r.followUp,
        interviewed: r.interviewed,
        offered: r.offered,
        hired: r.hired,
      },
    })),
  });
}
