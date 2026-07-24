import { NextRequest, NextResponse } from "next/server";
import { generateSituation } from "@/lib/scoring/generate";
import { sameOrigin, rateLimit, clientIp } from "@/lib/server/guard";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) return NextResponse.json({ error: "허용되지 않은 요청입니다." }, { status: 403 });
  if (!rateLimit(`situation:${clientIp(req)}`, 10, 60_000))
    return NextResponse.json({ error: "요청이 너무 많습니다. 잠시 후 다시 시도해주세요." }, { status: 429 });

  let body: { title?: string; who?: string; goal?: string; tension?: string; medium?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "잘못된 요청" }, { status: 400 });
  }
  const title = (body.title || "").trim();
  if (title.length < 2) {
    return NextResponse.json({ error: "상황 제목을 입력해주세요." }, { status: 400 });
  }
  try {
    const situation = await generateSituation({
      title,
      who: body.who,
      goal: body.goal,
      tension: body.tension,
      medium: body.medium === "email" ? "email" : "chat",
    });
    return NextResponse.json({ situation });
  } catch (e) {
    const msg = (e as Error).message;
    if (msg === "NO_KEY") {
      return NextResponse.json(
        { error: "GEMINI_API_KEY가 서버에 설정되지 않았습니다." },
        { status: 503 },
      );
    }
    console.error("[api/situation]", e);
    return NextResponse.json({ error: "상황 생성 중 문제가 발생했습니다: " + msg }, { status: 500 });
  }
}
