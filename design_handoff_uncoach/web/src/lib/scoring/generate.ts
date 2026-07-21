// 커스텀 상황 AI 생성 — 사용자의 짧은 설명으로 상황 스펙(관계·목적·긴장·루브릭)을 구성.
import { callGemini, extractText, GEMINI_MODEL } from "./gemini";
import type { Situation } from "../domain/types";

export interface GenerateInput {
  title: string;
  who?: string;
  goal?: string;
  tension?: string;
}

const level3 = { type: "ARRAY", items: { type: "STRING" }, minItems: 3, maxItems: 3 } as const;

// Gemini REST generateContent의 responseSchema(OpenAPI 서브셋 — type은 대문자)
const GEN_SCHEMA = {
  type: "OBJECT",
  required: ["rel", "counterpart", "goal", "tension", "direction", "axis", "sample", "opener", "rubric"],
  properties: {
    rel: { type: "STRING" },
    counterpart: { type: "STRING" },
    goal: { type: "STRING" },
    tension: { type: "STRING" },
    direction: { type: "STRING" },
    axis: { type: "STRING", enum: ["① 맥락", "② 격식", "③ 전략"] },
    sample: { type: "STRING" },
    opener: { type: "STRING", nullable: true },
    rubric: {
      type: "OBJECT",
      required: ["context", "register", "strategy"],
      properties: { context: level3, register: level3, strategy: level3 },
    },
  },
} as const;

const GEN_SYSTEM = `당신은 한국어 '화용 훈련' 상황 설계자입니다. 사용자가 연습하고 싶은 상황의 짧은 설명을 받아,
화용 코칭 앱에서 쓸 상황 카드를 설계합니다. 다음을 채우세요:
- rel: 상대의 관계 라벨(짧게, 예: 상사/교수/거래처/후배)
- counterpart: 상대가 어떤 사람이고 무엇을 신경쓰는지 한 문장(괄호로 심리 덧붙임 가능)
- goal: 사용자가 이루려는 목적 한 문장
- tension: 이 상황의 핵심 긴장·리스크 한 문장
- direction: 이 관계에서 '적절'의 방향 1~2문장(격식은 높을수록 좋은 게 아님을 반영)
- axis: 가장 핵심인 축 하나 (① 맥락 | ② 격식 | ③ 전략)
- sample: 사람들이 흔히 하는 부적절한 예시 초안 1~2문장
- opener: 상대가 먼저 보낼 법한 메시지(카톡형 대화면. 없으면 null)
- rubric: 각 축(context/register/strategy)의 [1점 위험, 2점 무난, 3점 적절] 기준 3개씩
격식은 높을수록 좋은 게 아니라 관계에 맞아야 합니다. 지정된 JSON만 출력하세요.`;

export async function generateSituation(input: GenerateInput): Promise<Situation> {
  const user =
    `[제목] ${input.title}\n` +
    (input.who ? `[상대] ${input.who}\n` : "") +
    (input.goal ? `[하고 싶은 말/목적] ${input.goal}\n` : "") +
    (input.tension ? `[어려운 점] ${input.tension}\n` : "") +
    `위 상황의 카드를 설계해 JSON으로만 출력하세요.`;

  const data = await callGemini(GEMINI_MODEL, {
    system_instruction: { parts: [{ text: GEN_SYSTEM }] },
    contents: [{ role: "user", parts: [{ text: user }] }],
    generationConfig: { maxOutputTokens: 2048, responseMimeType: "application/json", responseSchema: GEN_SCHEMA },
  });
  const g = JSON.parse(extractText(data));

  const trim3 = (a: unknown): string[] =>
    Array.isArray(a) ? a.slice(0, 3).map((x) => String(x)) : ["", "", ""];

  return {
    id: "c" + Date.now(),
    roles: [],
    title: input.title,
    rel: g.rel || "상대",
    counterpart: g.counterpart || "",
    goal: g.goal || input.goal || "",
    tension: g.tension || "",
    direction: g.direction || "",
    axis: g.axis || "① 맥락",
    sample: g.sample || "",
    opener: g.opener && g.opener !== "null" ? g.opener : null,
    medium: "chat",
    rubric: {
      context: trim3(g.rubric?.context),
      register: trim3(g.rubric?.register),
      strategy: trim3(g.rubric?.strategy),
    },
  };
}
