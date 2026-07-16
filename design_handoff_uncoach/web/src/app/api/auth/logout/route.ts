import { NextResponse } from "next/server";
import { endSession } from "@/lib/server/auth";

export const runtime = "nodejs";

export async function POST() {
  try {
    await endSession();
  } catch {}
  return NextResponse.json({ ok: true });
}
