import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";

export async function POST(request: Request) {
  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  const applicantId = formData.get("applicantId") as string | null;

  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  if (!applicantId) {
    return NextResponse.json({ error: "applicantId required" }, { status: 400 });
  }

  const maxSize = 5 * 1024 * 1024; // 5MB
  if (file.size > maxSize) {
    return NextResponse.json({ error: "File too large (max 5MB)" }, { status: 400 });
  }

  const allowed = [
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "text/plain",
  ];
  if (!allowed.includes(file.type)) {
    return NextResponse.json({ error: "Only PDF, DOC, DOCX, and TXT files are accepted" }, { status: 400 });
  }

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  const ext = file.name.split(".").pop() || "pdf";
  const safeFilename = `${applicantId}-${Date.now()}.${ext}`;

  const uploadDir = join(process.cwd(), "public", "uploads", "resumes");
  await mkdir(uploadDir, { recursive: true });
  await writeFile(join(uploadDir, safeFilename), buffer);

  const resumeUrl = `/uploads/resumes/${safeFilename}`;

  await prisma.applicant.update({
    where: { id: applicantId },
    data: { resumeUrl, resumeFilename: file.name },
  });

  return NextResponse.json({ resumeUrl, resumeFilename: file.name });
}
