import { NextRequest, NextResponse } from "next/server";
import { callGemini, extractText, extractSource, parseLooseJson, GEMINI_MODEL } from "@/lib/scoring/gemini";
import { NEWS_FETCH_SYSTEM } from "@/lib/scoring/context-system";
import { NEWS_CATEGORIES } from "@/lib/domain/news-categories";
import { sameOrigin, rateLimit, clientIp } from "@/lib/server/guard";
import type { NewsPassage } from "@/lib/domain/types";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) return NextResponse.json({ error: "허용되지 않은 요청입니다." }, { status: 403 });
  if (!rateLimit(`context-news:${clientIp(req)}`, 10, 60_000)) {
    return NextResponse.json({ error: "요청이 너무 많습니다. 잠시 후 다시 시도해주세요." }, { status: 429 });
  }

  let body: { category?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "잘못된 요청" }, { status: 400 });
  }
  const cat = NEWS_CATEGORIES.find((c) => c.key === body.category);
  if (!cat) return NextResponse.json({ error: "알 수 없는 카테고리입니다." }, { status: 400 });

  try {
    const data = await callGemini(GEMINI_MODEL, {
      system_instruction: { parts: [{ text: NEWS_FETCH_SYSTEM }] },
      contents: [{ role: "user", parts: [{ text: `${cat.query}. 위에서 최신 뉴스 하나를 골라 JSON으로만 반환하세요.` }] }],
      tools: [{ google_search: {} }],
      generationConfig: { temperature: 0.4, maxOutputTokens: 2048 },
    });
    const out = parseLooseJson(extractText(data));
    const keyPoints = Array.isArray(out.keyPoints) ? out.keyPoints.map((x: unknown) => String(x)).filter(Boolean) : [];
    if (!out.scene || !out.text || keyPoints.length === 0) {
      return NextResponse.json(
        { error: "마땅한 최신 뉴스를 찾지 못했어요. 다른 카테고리를 눌러보세요." },
        { status: 502 },
      );
    }
    const src = extractSource(data);
    const passage: NewsPassage = {
      id: "news_" + Date.now(),
      work: String(out.work || cat.label),
      scene: String(out.scene),
      text: String(out.text),
      keyPoints: keyPoints.slice(0, 4),
      sourceHint: String(out.sourceHint || ""),
      sourceUrl: src?.uri || "",
      sourceTitle: src?.title || "",
    };
    return NextResponse.json({ passage });
  } catch (e) {
    const msg = (e as Error).message;
    if (msg === "NO_KEY") {
      return NextResponse.json({ error: "GEMINI_API_KEY가 서버에 설정되지 않았습니다." }, { status: 503 });
    }
    console.error("[api/context/news]", e);
    return NextResponse.json({ error: msg || "뉴스를 불러오지 못했어요." }, { status: 500 });
  }
}
