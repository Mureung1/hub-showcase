import { NextRequest, NextResponse } from "next/server";
import { callGemini, extractText, parseLooseJson, GEMINI_MODEL } from "@/lib/scoring/gemini";
import { NEWS_SUMMARY_SYSTEM } from "@/lib/scoring/context-system";
import { sameOrigin, rateLimit, clientIp } from "@/lib/server/guard";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) return NextResponse.json({ error: "허용되지 않은 요청입니다." }, { status: 403 });
  if (!rateLimit(`context-summary:${clientIp(req)}`, 10, 60_000)) {
    return NextResponse.json({ error: "요청이 너무 많습니다. 잠시 후 다시 시도해주세요." }, { status: 429 });
  }

  let body: { passage?: { text?: string; keyPoints?: string[] }; draft?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "잘못된 요청" }, { status: 400 });
  }
  const draft = (body.draft || "").trim();
  const passage = body.passage;
  if (!passage?.text || !Array.isArray(passage.keyPoints)) {
    return NextResponse.json({ error: "잘못된 요청" }, { status: 400 });
  }
  if (draft.length < 5) {
    return NextResponse.json({ error: "요약을 조금 더 써주세요 — 이 지문의 핵심을 한 문장으로." }, { status: 400 });
  }

  const userMsg =
    `[지문]\n${passage.text}\n\n[이 지문의 핵심 포인트 — 요약이 담아야 할 핵심 요지]\n` +
    passage.keyPoints.map((k) => "- " + k).join("\n") +
    `\n\n[사용자의 한 줄 요약]\n${draft}\n\n위 요약이 핵심 포인트를 담았는지 채점해 JSON으로만 출력하세요.`;

  try {
    const data = await callGemini(GEMINI_MODEL, {
      system_instruction: { parts: [{ text: NEWS_SUMMARY_SYSTEM }] },
      contents: [{ role: "user", parts: [{ text: userMsg }] }],
      generationConfig: { maxOutputTokens: 2048, responseMimeType: "application/json" },
    });
    const out = parseLooseJson(extractText(data));
    const arr = (v: unknown): string[] => (Array.isArray(v) ? v.map((x) => String(x)).filter(Boolean) : []);
    const captured = arr(out.captured);
    const missed = arr(out.missed);
    const verdict = ["pass", "partial", "miss"].includes(out.verdict)
      ? out.verdict
      : missed.length === 0
        ? "pass"
        : captured.length === 0
          ? "miss"
          : "partial";
    return NextResponse.json({ captured, missed, verdict, coach: String(out.coach || "") });
  } catch (e) {
    const msg = (e as Error).message;
    if (msg === "NO_KEY") {
      return NextResponse.json({ error: "GEMINI_API_KEY가 서버에 설정되지 않았습니다." }, { status: 503 });
    }
    console.error("[api/context/summary]", e);
    return NextResponse.json({ error: msg || "채점에 실패했습니다." }, { status: 500 });
  }
}
