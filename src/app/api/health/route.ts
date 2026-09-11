import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  let banco = "ok";
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch (e) {
    banco = e instanceof Error ? e.message : "falhou";
  }
  return NextResponse.json(
    { ok: banco === "ok", banco, commit: process.env.GIT_SHA ?? null, build: process.env.BUILT_AT ?? null, worker: process.env.ENGOPS_WORKER === "1" },
    { status: banco === "ok" ? 200 : 503 },
  );
}
