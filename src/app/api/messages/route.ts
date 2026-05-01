import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const matchId = searchParams.get("matchId");

  if (!matchId) {
    return NextResponse.json({ error: "matchId required" }, { status: 400 });
  }

  const messages = await prisma.message.findMany({
    where: { matchId },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json(messages);
}

export async function POST(request: Request) {
  const { matchId, sender, content } = await request.json();

  if (!matchId || !sender || !content) {
    return NextResponse.json(
      { error: "matchId, sender, content required" },
      { status: 400 }
    );
  }

  const message = await prisma.message.create({
    data: { matchId, sender, content },
  });

  await prisma.match.update({
    where: { id: matchId },
    data: { updatedAt: new Date() },
  });

  return NextResponse.json(message);
}
