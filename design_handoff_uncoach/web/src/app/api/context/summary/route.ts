import { NextRequest, NextResponse } from "next/server";
import { callGemini, extractText, parseLooseJson, GEMINI_MODEL } from "@/lib/scoring/gemini";
import { NEWS_SUMMARY_SYSTEM } from "@/lib/scoring/context-system";
import { clampLevel, toScores, isCopied } from "@/lib/domain/news-score";
import { totalOf } from "@/lib/domain/situations";
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

    // 루브릭 점수는 모델이 뭘 뱉든 1~3으로 자른다. 아예 안 오면 포착률로 메운다.
    const raw = (out.scores ?? {}) as Record<string, unknown>;
    const fallback = captured.length === 0 ? 1 : missed.length === 0 ? 3 : 2;
    const scores = {
      grasp: clampLevel(raw.grasp ?? fallback),
      accuracy: clampLevel(raw.accuracy ?? fallback),
      concision: clampLevel(raw.concision ?? fallback),
    };
    const rs = (out.reasons ?? {}) as Record<string, unknown>;
    const reason = (k: string) => (rs[k] ? String(rs[k]) : undefined);
    const reasons: Record<"grasp" | "accuracy" | "concision", string | undefined> = {
      grasp: reason("grasp"),
      accuracy: reason("accuracy"),
      concision: reason("concision"),
    };
    let coach = String(out.coach || "");

    // 지문을 그대로 베낀 요약은 '고른 것도 압축한 것도' 아니라 두 축을 1점으로 내린다.
    // 사실 정확성은 건드리지 않는다 — 베낀 글은 실제로 정확하므로, 여기서 깎으면 없는 흠을 지어내는 셈이다.
    if (isCopied(draft, passage.text)) {
      scores.grasp = 1;
      scores.concision = 1;
      reasons.grasp = "지문에서 직접 골라내지 않고 문장을 그대로 옮겼습니다.";
      reasons.concision = "내 말로 압축하지 않고 지문을 그대로 베꼈습니다.";
      coach =
        "지문을 거의 그대로 옮겨 적었어요. 요약은 가장 중요한 한 가지를 직접 골라 내 말로 압축하는 연습이에요 — 한 문장으로 다시 써볼까요?";
    }

    // verdict는 이제 3축 총점에서 파생한다 — 모델이 따로 준 판정과 점수가 어긋나지 않게.
    const total = totalOf(toScores(scores));
    const verdict = total >= 80 ? "pass" : total >= 50 ? "partial" : "miss";

    return NextResponse.json({ captured, missed, verdict, scores, reasons, coach });
  } catch (e) {
    const msg = (e as Error).message;
    if (msg === "NO_KEY") {
      return NextResponse.json({ error: "GEMINI_API_KEY가 서버에 설정되지 않았습니다." }, { status: 503 });
    }
    console.error("[api/context/summary]", e);
    return NextResponse.json({ error: msg || "채점에 실패했습니다." }, { status: 500 });
  }
}
