import { z } from "zod";
import type { EnsembleWeather, Diagnosis, Proposal } from "shared";
import { checkGuardrails } from "./guardrails";

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

  return `당신은 한국 소상공인의 매출을 높이는 실전 마케팅 카피라이터입니다.
아래 정보를 참고해, 오늘 손님의 방문·주문을 유도하는 마케팅 제안 1개를 만드세요.

[매장]
- 이름: ${store.name}
- 업종: ${store.category}
- 대표 메뉴: ${store.menuTags.join(", ")}
- 톤: ${store.tone}

[오늘 날씨]
- 상태: ${weather.condition}, 기온 ${weather.tempC}℃, 강수확률 ${pop}
- 강수 여부: ${weather.isPrecipitating ? "비/눈 있음" : "강수 없음"}

[매출 진단 — 내부 참고용]
- 이 가게는 비 오는 날 매출이 안 오는 날 대비 ${rainPct}% ${diagnosis.estimated ? "(추정치)" : "(실측)"}
- 이 수치는 제안 방향을 정하기 위한 내부 정보입니다. 손님에게 보이는 title·copy에 매출·하락·진단 이야기를 절대 넣지 마세요.

작성 규칙:
- 목표: 손님이 "지금 가고 싶다 / 주문하고 싶다"고 느끼게 하는 행동 유도 카피. 감성 에세이가 아닙니다.
- copy 흐름: (1) 오늘 날씨를 손님 입장에서 가볍게 언급 → (2) 우리 메뉴·혜택 제시 → (3) 명확한 행동 유도(주문·방문·픽업).
- 상호는 "${store.name}" 그대로만 쓰세요. 다른 가게 이름을 지어내지 마세요(없는 상호 창작 금지).
- 밝고 친근한 톤. 부정적·우울한 표현("매출이 걱정", "안타까운", "마음이 아파요" 등) 금지.
- 매장 내부 사정(매출 하락·진단 수치 등)을 문구에 노출 금지.
- 모든 문구(title·copy·promo)는 오직 한국어로만. 한자·중국어·일본어·영어 단어 금지 (이모지 허용).
- 의료 효능·과장 표현(치료·완치·효능·최고·1등·무조건·100% 등) 금지.
- 할인율은 20%를 넘지 마세요.
- channels는 instagram, x, dangol 중에서 고르세요.

[좋은 예시] (비 오는 날)
title: 비 오는 날 픽업 10% 할인
copy: ☔ 비 오는 오늘, 나가기 귀찮으시죠?
따뜻한 아메리카노 미리 주문하고 픽업만 쏙 해가세요 ☕
오늘 픽업 주문 10% 할인이에요 🎉

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

/** 제안 응답 스키마. LLM 출력이 이 형태를 지키는지 런타임 검증한다. */
const proposalSchema = z.object({
  title: z.string().min(1),
  copy: z.string().min(1),
  promo: z.object({ type: z.string().min(1), value: z.string().min(1) }),
  channels: z.array(z.string()).min(1),
});

/** raw 문자열을 파싱·검증한다. 실패하면 null (예외를 던지지 않음). */
function parseAndValidate(raw: string): Proposal | null {
  try {
    const parsed = proposalSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : null;
  } catch {
    return null; // JSON 파싱 실패
  }
}

/** LLM 없이 만드는 안전한 기본 제안 (재생성까지 실패했을 때 폴백). */
export function buildFallbackProposal(ctx: ProposalContext): Proposal {
  const { store, weather } = ctx;
  const rainy = weather.isPrecipitating;
  return {
    title: rainy ? "비 오는 날 픽업 혜택" : "오늘의 방문 혜택",
    copy: rainy
      ? `☔ 비 오는 오늘, ${store.name}에서 따뜻하게 픽업 어떠세요?\n미리 주문하고 편하게 받아가세요 🏃`
      : `오늘 ${store.name}에서 특별한 혜택을 준비했어요.\n지나는 길에 편하게 들러주세요 ☕`,
    promo: { type: "할인", value: "픽업 10% 할인" },
    channels: ["dangol"],
  };
}

/** 한 번 호출해서 파싱·검증까지 시도한다. 호출/파싱/검증 어디서 실패해도 null. */
async function tryGenerate(
  caller: LLMCaller,
  prompt: string,
  apiKey: string,
  storeName: string,
): Promise<Proposal | null> {
  try {
    const proposal = parseAndValidate(await caller(prompt, apiKey));
    if (!proposal) return null; // 파싱·스키마 실패
    if (!checkGuardrails(proposal, storeName).ok) return null; // 가드레일 위반 → 재생성 대상
    return proposal;
  } catch {
    return null; // 네트워크 등 호출 실패
  }
}

/**
 * 제안을 생성한다: 프롬프트 → LLM 호출 → zod 검증.
 * 실패 시 1회 재생성하고, 재실패하면 템플릿으로 폴백해 항상 유효한 제안을 반환한다.
 */
export async function generateProposal(
  ctx: ProposalContext,
  deps: GenerateDeps = {},
): Promise<Proposal> {
  const apiKey = deps.apiKey ?? process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error("GROQ_API_KEY 가 설정되지 않았습니다");

  const caller = deps.caller ?? callGroq;
  const prompt = buildProposalPrompt(ctx);

  const first = await tryGenerate(caller, prompt, apiKey, ctx.store.name);
  if (first) return first;

  const retry = await tryGenerate(caller, prompt, apiKey, ctx.store.name); // 1회 재생성
  if (retry) return retry;

  return buildFallbackProposal(ctx); // 템플릿 폴백
}
