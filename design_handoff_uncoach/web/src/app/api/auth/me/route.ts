import { NextResponse } from "next/server";
import { dbConfigured } from "@/lib/db/client";
import { getSessionUser } from "@/lib/server/auth";

export const runtime = "nodejs";

export async function GET() {
  if (!dbConfigured()) return NextResponse.json({ user: null, authAvailable: false });
  try {
    const user = await getSessionUser();
    return NextResponse.json({ user: user ? { email: user.email } : null, authAvailable: true });
  } catch {
    return NextResponse.json({ user: null, authAvailable: true });
  }
}
