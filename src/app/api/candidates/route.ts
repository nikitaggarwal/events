import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const candidates = await prisma.candidate.findMany({
    include: { event: true },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(candidates);
}

export async function PATCH(request: Request) {
  const { id, inviteStatus } = await request.json();

  if (!id || !inviteStatus) {
    return NextResponse.json(
      { error: "id and inviteStatus are required" },
      { status: 400 }
    );
  }

  const candidate = await prisma.candidate.update({
    where: { id },
    data: { inviteStatus },
  });

  return NextResponse.json(candidate);
}
