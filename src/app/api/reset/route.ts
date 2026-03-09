import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST() {
  await prisma.candidate.deleteMany();
  await prisma.event.deleteMany();
  await prisma.job.deleteMany();
  await prisma.cluster.deleteMany();
  await prisma.company.deleteMany();

  return NextResponse.json({ success: true, message: "All data cleared" });
}
