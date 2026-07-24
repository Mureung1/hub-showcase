// 커스텀 상황 AI 생성 — 사용자의 짧은 설명으로 상황 스펙(관계·목적·긴장·루브릭)을 구성.
import { callGemini, extractText, parseLooseJson, GEMINI_MODEL } from "./gemini";
import type { Situation } from "../domain/types";

export interface GenerateInput {
  title: string;
  who?: string;
  goal?: string;
  tension?: string;
  /** 대화(chat) / 메일(email) — 어느 화면에서 훈련할지. 기본 대화. */
  medium?: 'chat' | 'email';
}

const level3 = { type: "ARRAY", items: { type: "STRING" }, minItems: 3, maxItems: 3 } as const;

// Gemini REST generateContent의 responseSchema(OpenAPI 서브셋 — type은 대문자)
const GEN_SCHEMA = {
  type: "OBJECT",
  required: ["title", "rel", "counterpart", "goal", "tension", "direction", "axis", "sample", "opener", "rubric"],
  properties: {
    title: { type: "STRING" },
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
- title: 카드에 걸 제목. 사용자가 쓴 문장을 그대로 옮기지 말고 15자 안팎의 명사구로 다듬으세요
  (예: "조별과제에서 혼자 일 다 하는데 어떻게 말하죠" → "무임승차 조원에게 참여 요청")
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
  const medium = input.medium === 'email' ? 'email' : 'chat';
  const user =
    `[제목] ${input.title}\n` +
    (input.who ? `[상대] ${input.who}\n` : "") +
    (input.goal ? `[하고 싶은 말/목적] ${input.goal}\n` : "") +
    (input.tension ? `[어려운 점] ${input.tension}\n` : "") +
    // 메일은 상대의 첫 메시지(opener)가 없고 격식 기준도 달라서, 어느 매체인지 알려줘야 한다.
    (medium === 'email'
      ? `[매체] 이메일 — 격식 있는 문어체 기준으로 루브릭을 쓰고, opener는 null로 두세요.\n`
      : `[매체] 메신저 대화 — 주고받는 말투 기준으로 루브릭을 쓰고, opener에 상대의 첫 메시지를 넣으세요.\n`) +
    `위 상황의 카드를 설계해 JSON으로만 출력하세요.`;

  const data = await callGemini(GEMINI_MODEL, {
    system_instruction: { parts: [{ text: GEN_SYSTEM }] },
    contents: [{ role: "user", parts: [{ text: user }] }],
    // 루브릭이 한국어 9문장 + 설명 필드라 2048로는 응답이 중간에 잘려 JSON 파싱이 깨졌다.
    generationConfig: { maxOutputTokens: 4096, responseMimeType: "application/json", responseSchema: GEN_SCHEMA },
  });
  let raw: Record<string, unknown>;
  try {
    raw = parseLooseJson(extractText(data));
  } catch {
    throw new Error("상황을 만들다가 응답이 끊겼어요. 한 번 더 시도해주세요.");
  }
  const g = raw as {
    title?: string; rel?: string; counterpart?: string; goal?: string; tension?: string; direction?: string;
    axis?: string; sample?: string; opener?: string | null; rubric?: Record<string, unknown>;
  };

  const trim3 = (a: unknown): string[] =>
    Array.isArray(a) ? a.slice(0, 3).map((x) => String(x)) : ["", "", ""];

  return {
    id: "c" + Date.now(),
    roles: [],
    // 사용자가 쓴 건 한 문장이라 카드 제목으로는 길다. 모델이 다듬은 제목을 쓰되, 없으면 앞부분을 자른다.
    title: (g.title || "").trim() || (input.title.length > 24 ? input.title.slice(0, 24) + "…" : input.title),
    rel: g.rel || "상대",
    counterpart: g.counterpart || "",
    goal: g.goal || input.goal || "",
    tension: g.tension || "",
    direction: g.direction || "",
    axis: g.axis || "① 맥락",
    sample: g.sample || "",
    opener: medium === 'email' ? null : g.opener && g.opener !== "null" ? g.opener : null,
    medium,
    rubric: {
      context: trim3(g.rubric?.context),
      register: trim3(g.rubric?.register),
      strategy: trim3(g.rubric?.strategy),
    },
  };
}
