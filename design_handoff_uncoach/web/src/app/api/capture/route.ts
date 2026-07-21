import { NextRequest, NextResponse } from "next/server";
import { callGemini, extractText, parseLooseJson, GEMINI_MODEL } from "@/lib/scoring/gemini";
import { CAPTURE_SYSTEM } from "@/lib/scoring/context-system";
import { sameOrigin, rateLimit, clientIp } from "@/lib/server/guard";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_IMAGE_BYTES = 6 * 1024 * 1024;

export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) return NextResponse.json({ error: "허용되지 않은 요청입니다." }, { status: 403 });
  if (!rateLimit(`capture:${clientIp(req)}`, 10, 60_000)) {
    return NextResponse.json({ error: "요청이 너무 많습니다. 잠시 후 다시 시도해주세요." }, { status: 429 });
  }

  let body: { imageBase64?: string; mimeType?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "잘못된 요청" }, { status: 400 });
  }
  const { imageBase64, mimeType } = body;
  if (!imageBase64 || !mimeType || !/^image\//.test(mimeType)) {
    return NextResponse.json({ error: "이미지 파일을 올려주세요." }, { status: 400 });
  }
  if (imageBase64.length * 0.75 > MAX_IMAGE_BYTES) {
    return NextResponse.json({ error: "이미지가 너무 큽니다." }, { status: 413 });
  }

  try {
    const data = await callGemini(GEMINI_MODEL, {
      system_instruction: { parts: [{ text: CAPTURE_SYSTEM }] },
      contents: [
        {
          role: "user",
          parts: [
            { inline_data: { mime_type: mimeType, data: imageBase64 } },
            { text: "위 대화 캡쳐를 읽고 훈련 상황 정보를 JSON으로 추출하세요. 실명·전화번호 등 개인정보는 반드시 익명화하세요." },
          ],
        },
      ],
      generationConfig: { maxOutputTokens: 1024, responseMimeType: "application/json" },
    });
    const out = parseLooseJson(extractText(data));
    const clip = (v: unknown, n: number) => String(v || "").slice(0, n);
    const title = clip(out.title, 60).trim();
    if (!title) {
      return NextResponse.json(
        { error: "대화를 인식하지 못했어요. 다른 캡쳐를 올리거나 직접 입력해주세요." },
        { status: 422 },
      );
    }
    return NextResponse.json({
      title,
      who: clip(out.who, 120),
      rel: clip(out.rel, 30),
      goal: clip(out.goal, 120),
      tension: clip(out.tension, 120),
    });
  } catch (e) {
    const msg = (e as Error).message;
    if (msg === "NO_KEY") {
      return NextResponse.json({ error: "GEMINI_API_KEY가 서버에 설정되지 않았습니다." }, { status: 503 });
    }
    console.error("[api/capture]", e);
    return NextResponse.json({ error: msg || "캡쳐에서 상황을 읽지 못했어요." }, { status: 500 });
  }
}
