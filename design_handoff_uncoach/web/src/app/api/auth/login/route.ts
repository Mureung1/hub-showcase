import { NextRequest, NextResponse } from "next/server";
import { dbConfigured } from "@/lib/db/client";
import { findUserByEmail, adoptBlobIfEmpty } from "@/lib/db/auth-repo";
import { verifyPassword, startSession } from "@/lib/server/auth";
import { getDeviceId } from "@/lib/server/device";
import { sameOrigin, rateLimit, clientIp } from "@/lib/server/guard";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) return NextResponse.json({ error: "허용되지 않은 요청입니다." }, { status: 403 });
  if (!rateLimit(`login:${clientIp(req)}`, 10, 60_000))
    return NextResponse.json({ error: "요청이 너무 많습니다. 잠시 후 다시 시도해주세요." }, { status: 429 });
  if (!dbConfigured())
    return NextResponse.json({ error: "계정 기능은 서버 DB 연결이 필요합니다." }, { status: 503 });

  let body: { email?: string; password?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "잘못된 요청" }, { status: 400 });
  }
  const email = (body.email || "").trim().toLowerCase();
  const password = body.password || "";
  if (!email || !password) return NextResponse.json({ error: "이메일과 비밀번호를 입력해주세요." }, { status: 400 });

  try {
    const user = await findUserByEmail(email);
    if (!user || !(await verifyPassword(password, user.pass_hash)))
      return NextResponse.json({ error: "이메일 또는 비밀번호가 올바르지 않습니다." }, { status: 401 });
    await startSession(user.id);
    // 계정에 저장 상태가 없으면(첫 로그인) 이 기기 진척을 이관
    const device = await getDeviceId();
    await adoptBlobIfEmpty(`u:${user.id}`, device);
    return NextResponse.json({ user: { email: user.email } });
  } catch (e) {
    console.error("[api/auth/login]", e);
    return NextResponse.json({ error: "로그인 중 문제가 발생했습니다." }, { status: 500 });
  }
}
