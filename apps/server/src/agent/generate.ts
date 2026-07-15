import type { EnsembleWeather, Diagnosis, Proposal } from "shared";

/**
 * LLM 마케팅 제안 생성 (2-2 초안).
 *
 * provider(호출부)와 프롬프트(요청 문구)를 분리해, 나중에 Claude로 교체하려면
 * `LLMCaller`만 바꾸면 되도록 했다. 현재는 무료 Groq(OpenAI 호환) 사용.
 * zod 검증·가드레일은 2-3, 2-4에서 붙인다.
 */

const GROQ_ENDPOINT = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_MODEL = "llama-3.3-70b-versatile";
const TIMEOUT_MS = 15_000;

export interface StoreProfile {
  name: string;
  category: string;
  menuTags: string[];
  tone: string;
}

export interface ProposalContext {
  store: StoreProfile;
  weather: EnsembleWeather;
  diagnosis: Diagnosis;
}

/** LLM 호출부. provider 교체 지점(테스트에서 주입 가능). */
export type LLMCaller = (prompt: string, apiKey: string) => Promise<string>;

export interface GenerateDeps {
  apiKey?: string;
  caller?: LLMCaller;
}

/** 날씨+매장+진단을 묶어 제안 요청 프롬프트를 만든다. */
export function buildProposalPrompt(ctx: ProposalContext): string {
  const { store, weather, diagnosis } = ctx;
  const rainPct = Math.round(diagnosis.rainImpactPct * 100);
  const pop = weather.precipitationProb === null ? "정보없음" : `${weather.precipitationProb}%`;

  return `당신은 한국 소상공인의 날씨 기반 마케팅 문구를 쓰는 카피라이터입니다.
아래 정보를 바탕으로 오늘 손님을 유도할 마케팅 제안을 1개 만드세요.

[매장]
- 이름: ${store.name}
- 업종: ${store.category}
- 대표 메뉴: ${store.menuTags.join(", ")}
- 톤: ${store.tone}

[오늘 날씨]
- 상태: ${weather.condition}, 기온 ${weather.tempC}℃, 강수확률 ${pop}
- 강수 여부: ${weather.isPrecipitating ? "비/눈 있음" : "강수 없음"}

[매출 진단]
- 이 가게는 비 오는 날 매출이 안 오는 날 대비 ${rainPct}% ${diagnosis.estimated ? "(추정치)" : "(실측)"}

요구사항:
- 오늘 날씨와 매출 패턴에 맞는 실질적 제안을 하세요.
- copy는 이모지를 포함한 자연스러운 한국어 2~4줄로 쓰세요.
- 할인율은 20%를 넘지 마세요.
- channels는 instagram, x, dangol 중에서 고르세요.

반드시 아래 JSON 형식으로만 응답하세요(다른 텍스트 없이):
{"title": "캠페인 제목", "copy": "발송 문구", "promo": {"type": "할인", "value": "픽업 10% 할인"}, "channels": ["dangol", "instagram"]}`;
}

/** Groq(OpenAI 호환) REST 호출 (기본 provider). */
const callGroq: LLMCaller = async (prompt, apiKey) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(GROQ_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
        temperature: 0.7,
      }),
      signal: controller.signal,
    });
    if (!res.ok) {
      throw new Error(`Groq HTTP ${res.status}: ${await res.text()}`);
    }
    const json = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const text = json.choices?.[0]?.message?.content;
    if (!text) throw new Error("Groq 응답이 비어 있습니다");
    return text;
  } finally {
    clearTimeout(timer);
  }
};

/** 제안을 생성한다. 프롬프트 → LLM 호출 → JSON 파싱. */
export async function generateProposal(
  ctx: ProposalContext,
  deps: GenerateDeps = {},
): Promise<Proposal> {
  const apiKey = deps.apiKey ?? process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error("GROQ_API_KEY 가 설정되지 않았습니다");

  const caller = deps.caller ?? callGroq;
  const raw = await caller(buildProposalPrompt(ctx), apiKey);
  return JSON.parse(raw) as Proposal;
}
