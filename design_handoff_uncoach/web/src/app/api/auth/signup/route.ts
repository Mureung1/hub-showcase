import { NextRequest, NextResponse } from "next/server";
import { dbConfigured } from "@/lib/db/client";
import { findUserByEmail, createUser, adoptBlobIfEmpty } from "@/lib/db/auth-repo";
import { hashPassword, newUserId, startSession } from "@/lib/server/auth";
import { getDeviceId } from "@/lib/server/device";
import { sameOrigin, rateLimit, clientIp } from "@/lib/server/guard";

export const runtime = "nodejs";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) return NextResponse.json({ error: "허용되지 않은 요청입니다." }, { status: 403 });
  if (!rateLimit(`signup:${clientIp(req)}`, 8, 60_000))
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
  if (!EMAIL_RE.test(email)) return NextResponse.json({ error: "이메일 형식이 올바르지 않습니다." }, { status: 400 });
  if (password.length < 6) return NextResponse.json({ error: "비밀번호는 6자 이상이어야 합니다." }, { status: 400 });

  try {
    if (await findUserByEmail(email))
      return NextResponse.json({ error: "이미 가입된 이메일입니다. 로그인해주세요." }, { status: 409 });
    const id = newUserId();
    await createUser(id, email, await hashPassword(password));
    await startSession(id);
    // 익명(기기)으로 쌓은 진척을 계정으로 이관
    const device = await getDeviceId();
    await adoptBlobIfEmpty(`u:${id}`, device);
    return NextResponse.json({ user: { email } });
  } catch (e) {
    console.error("[api/auth/signup]", e);
    return NextResponse.json({ error: "회원가입 중 문제가 발생했습니다." }, { status: 500 });
  }
}
