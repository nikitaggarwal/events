import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { runSeedDemo } from "@/lib/seed-demo";

/**
 * Demo seed for portfolio / staging. Writes to whatever DATABASE_URL is configured
 * (including production on Vercel).
 *
 * Production: set SEED_DEMO_SECRET in Vercel env, then POST once with header:
 *   x-seed-demo-secret: <same value>
 *   (or Authorization: Bearer <same value>)
 * Without the secret in production, this route returns 404 so it is not public.
 *
 * Local CLI (no HTTP): npm run seed-demo
 */
export const maxDuration = 300;

function rejectAsNotFound() {
  return new NextResponse(null, { status: 404 });
}

function verifySeedAccess(request: Request): boolean {
  const secret = process.env.SEED_DEMO_SECRET?.trim();
  const onVercelProduction = process.env.VERCEL_ENV === "production";
  const productionLike = onVercelProduction || process.env.NODE_ENV === "production";

  if (productionLike && !secret) {
    return false;
  }

  if (!secret) {
    return true;
  }

  const header = request.headers.get("x-seed-demo-secret");
  const auth = request.headers.get("authorization");
  const bearer = auth?.startsWith("Bearer ") ? auth.slice(7).trim() : null;
  return header === secret || bearer === secret;
}

export async function POST(request: Request) {
  if (!verifySeedAccess(request)) {
    return rejectAsNotFound();
  }

  try {
    const { results } = await runSeedDemo(prisma);
    return NextResponse.json({ ok: true, results });
  } catch (e) {
    console.error("seed-demo failed", e);
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "Seed failed" },
      { status: 500 },
    );
  }
}
