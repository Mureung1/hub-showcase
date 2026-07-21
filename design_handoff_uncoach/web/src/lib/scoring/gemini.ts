// Gemini 서버 호출 인프라 — 뉴스 grounding·요약채점·캡쳐vision·채점 전용.
export const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";

export interface GeminiPart {
  text?: string;
  inline_data?: { mime_type: string; data: string };
}

export interface GeminiBody {
  system_instruction?: { parts: [{ text: string }] };
  contents: [{ role: "user"; parts: GeminiPart[] }];
  generationConfig?: Record<string, unknown>;
  tools?: Array<Record<string, unknown>>;
}

export interface GeminiResponse {
  candidates?: Array<{
    content?: { parts?: Array<{ text?: string }> };
    finishReason?: string;
    groundingMetadata?: { groundingChunks?: Array<{ web?: { uri?: string; title?: string } }> };
  }>;
  promptFeedback?: { blockReason?: string };
  error?: { message?: string; details?: Array<{ retryDelay?: string; retryInfo?: { retryDelay?: string } }> };
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function retryAfterSec(data: GeminiResponse | null): number | null {
  const details = data?.error?.details || [];
  for (const d of details) {
    const v = d.retryDelay || d.retryInfo?.retryDelay;
    const n = v ? parseFloat(v) : NaN;
    if (n > 0) return n;
  }
  const m = (data?.error?.message || "").match(/retry in ([\d.]+)\s*s/i);
  return m ? parseFloat(m[1]) : null;
}

function friendlyError(status: number, data: GeminiResponse | null): Error {
  const raw = data?.error?.message || `HTTP ${status}`;
  if (status === 429) {
    const s = retryAfterSec(data);
    if (!s || s > 300) {
      const when = s ? `약 ${Math.ceil(s / 60)}분 뒤` : "내일";
      return new Error(`Gemini 무료 사용량 한도를 다 썼습니다. ${when}에 다시 시도해주세요.`);
    }
    return new Error(`Gemini 요청 한도에 걸렸습니다. 약 ${Math.ceil(s)}초 뒤에 다시 시도해주세요.`);
  }
  if (status === 400 && /API[_ ]key not valid|API_KEY_INVALID/i.test(raw)) {
    return new Error("Gemini API 키가 올바르지 않습니다.");
  }
  if (status === 403) return new Error("이 Gemini API 키로는 요청이 거부되었습니다.");
  if (status >= 500) return new Error("Gemini 서버가 일시적으로 불안정합니다. 잠시 뒤 다시 시도해주세요.");
  return new Error(raw);
}

/** Gemini 응답에서 첫 JSON 블록을 관대하게 파싱한다(트레일링 콤마·스마트따옴표 허용). */
export function parseLooseJson(raw: string) {
  const text = String(raw ?? "");
  const m = text.match(/\{[\s\S]*\}/);
  if (!m) throw new Error(`JSON 형식이 아닌 응답: ${text.slice(0, 150)}`);
  try {
    return JSON.parse(m[0]);
  } catch {
    const cleaned = m[0]
      .replace(/,(\s*[}\]])/g, "$1")
      .replace(/[“”]/g, '"')
      .replace(/[‘’]/g, "'");
    return JSON.parse(cleaned);
  }
}

/** 응답 후보의 텍스트 파트를 이어붙인다. */
export function extractText(data: GeminiResponse): string {
  return (data.candidates?.[0]?.content?.parts || []).map((p) => p.text || "").join("");
}

/** grounding 메타데이터에서 첫 실제 출처 URL을 뽑는다(모델이 지어낸 링크 대신 실제 검색 결과 링크). */
export function extractSource(data: GeminiResponse): { uri: string; title: string } | null {
  const chunks = (data.candidates?.[0]?.groundingMetadata?.groundingChunks || [])
    .map((c) => c.web)
    .filter((w): w is { uri: string; title?: string } => !!w?.uri);
  const src = chunks[0];
  return src ? { uri: src.uri, title: src.title || "" } : null;
}

/** Gemini generateContent 호출. 429/5xx는 RetryInfo 기반 자동 재시도(최대 3회, 45초 상한). */
export async function callGemini(model: string, body: GeminiBody): Promise<GeminiResponse> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("NO_KEY");
  const MAX_ATTEMPTS = 3;
  const MAX_WAIT_SEC = 45;
  for (let attempt = 1; ; attempt++) {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": key },
      body: JSON.stringify(body),
    });
    const data = (await res.json().catch(() => null)) as GeminiResponse | null;

    if (res.ok) {
      const text = extractText(data || {});
      if (text) return data as GeminiResponse;
      const reason = data?.candidates?.[0]?.finishReason || data?.promptFeedback?.blockReason || "알 수 없음";
      if (reason === "MAX_TOKENS") throw new Error("응답이 너무 길어 잘렸습니다.");
      if (reason === "SAFETY" || reason === "PROHIBITED_CONTENT") throw new Error("안전 필터에 걸려 처리하지 못했습니다.");
      throw new Error(`Gemini가 빈 응답을 보냈습니다 (사유: ${reason})`);
    }

    const retryable = res.status === 429 || res.status >= 500;
    const wait = res.status === 429 ? (retryAfterSec(data) ?? 20) : 2 * attempt;
    if (retryable && attempt < MAX_ATTEMPTS && wait <= MAX_WAIT_SEC) {
      await sleep(wait * 1000 + 400);
      continue;
    }
    throw friendlyError(res.status, data);
  }
}
