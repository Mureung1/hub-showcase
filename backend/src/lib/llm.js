// LLM 클라이언트 래퍼 (ADR-008 · llm-agent-plan §4~5).
// - 외부 LLM 호출은 반드시 backend에서만. 키는 .env(GEMINI_API_KEY)에서만 읽는다(프론트 노출 금지).
// - responseSchema 로 JSON 강제. 429/503 시 유한 모델 폴백(고정 배열 단일 패스 → 무한루프 구조적 차단).
// - 실패·타임아웃·키 없음이면 null 반환 → 호출부가 규칙 설문으로 폴백한다.
// - 제공자는 Gemini 우선(교체 가능하게 함수 경계로 감쌈).
import { GoogleGenAI, Type } from "@google/genai";

const API_KEY = process.env.GEMINI_API_KEY || "";
export const isLlmAvailable = Boolean(API_KEY);

// "-latest" 별칭 우선. 2026-07-22 라이브 검증: 버전 고정 ID(gemini-2.5-flash 등)는 신규 계정에
// 404("no longer available to new users")로 막히고, gemini-2.0-flash-001은 무료 티어 쿼터가 0(429)이라
// 실패했다. "-latest" 별칭은 두 계정 제약을 모두 피해 정상 동작을 확인했다(llm-agent-plan §1).
// 429(쿼터)·503(과부하)·404(모델 폐기) 시 다음 모델로 넘어간다. 배열 길이만큼만 시도 → 무한루프 없음.
const MODEL_CHAIN = ["gemini-flash-latest", "gemini-flash-lite-latest"];
const CALL_TIMEOUT_MS = 12000;

const MBTI_TYPES = new Set([
  "ISTJ", "ISFJ", "INFJ", "INTJ", "ISTP", "ISFP", "INFP", "INTP",
  "ESTP", "ESFP", "ENFP", "ENTP", "ESTJ", "ESFJ", "ENFJ", "ENTJ",
]);

// 우리 행동지표 키(scoring). observedSignals가 이 용어로 근거를 달도록 유도한다(판정 대체가 아닌 보완).
const INDICATOR_KEYS = [
  "focusEnergy", "inputStyle", "memoryStrategy", "planningStability", "flexibilityNeed",
  "emotionImpact", "failureRecovery", "stimulationNeed", "burnoutCaution", "selfUnderstanding",
];

// 간이 MBTI 추정 출력 계약(비진단·간이 추정). llm-agent-plan §3 / AI_Pipeline_Design.md.
// observedSignals(ADR-008 보완): 대화에서 관찰된 일상 근거를 우리 행동지표에 연결해 "판정 근거"를 투명하게 보완한다.
const ESTIMATE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    mbti: { type: Type.STRING, description: "4글자 대문자 MBTI 또는 빈 문자열(불명확)" },
    confidence: { type: Type.STRING, enum: ["low", "mid"], description: "간이 추정 확신도(high 없음)" },
    rationale: { type: Type.STRING, description: "대화에서 관찰된 근거 1~2문장(가능성 표현)" },
    uncertainty: { type: Type.STRING, description: "한계·주의 1문장" },
    observedSignals: {
      type: Type.ARRAY,
      description: "대화에서 관찰된 일상 근거 2~3개. 판정을 대체하지 않고 근거를 보완한다.",
      items: {
        type: Type.OBJECT,
        properties: {
          signal: { type: Type.STRING, description: "관찰된 일상 근거 짧은 구절(가능성 표현, 단정 금지)" },
          indicator: {
            type: Type.STRING,
            description: `연결되는 행동지표 키(다음 중 하나 또는 빈 문자열): ${INDICATOR_KEYS.join(", ")}`,
          },
        },
        required: ["signal", "indicator"],
      },
    },
    disallowed_check: { type: Type.BOOLEAN, description: "진단·성적예측·유형 우열 표현을 넣지 않았으면 true" },
  },
  required: ["mbti", "confidence", "rationale", "uncertainty", "observedSignals", "disallowed_check"],
};

const SYSTEM_INSTRUCTION = [
  "너는 사용자의 짧은 대화(약 2회)를 바탕으로 MBTI 4글자를 '간이 추정'하는 보조자다.",
  "이것은 공식 판정이 아니라 탐색적 간이 추정이다. 진단·성적 예측·유형 간 우열 표현을 절대 하지 않는다.",
  "확신이 낮거나 근거가 부족하면 mbti를 빈 문자열로 두고 confidence를 low로 한다.",
  "항상 가능성의 언어(…일 수 있음)를 쓰고, 사용자를 평가하지 않는다.",
  "observedSignals에는 대화에서 실제로 관찰된 일상 근거를 2~3개 담되, 각 근거를 제공된 행동지표 키 중 가장 관련된 하나에 연결한다(애매하면 indicator를 빈 문자열로). 이 근거는 판정을 대체하지 않고 왜 이 유형을 시작점으로 삼았는지 보완 설명하는 용도다.",
  "출력은 반드시 주어진 JSON 스키마를 따른다.",
].join(" ");

// 보충 모드(ADR-008 확장): 사용자가 이미 확정한 MBTI(공식 입력 또는 간이 추정)에 대해 대화 근거를 "보충"한다.
// 유형을 새로 판정·변경하지 않고, 대화에서 관찰된 일상 근거(observedSignals)와 그 유형과의 연결(rationale)만 만든다.
function buildSupplementInstruction(knownMbti) {
  return [
    `사용자의 MBTI는 이미 ${knownMbti}로 확정돼 있다(공식 입력 또는 간이 추정).`,
    "너의 역할은 유형을 새로 판정하거나 바꾸는 것이 아니라, 짧은 대화에서 관찰된 일상 근거로 그 유형을 '보충 설명'하는 것이다.",
    `mbti 필드에는 반드시 ${knownMbti}를 그대로 넣는다(다른 유형으로 바꾸지 않는다).`,
    "진단·성적 예측·유형 간 우열 표현을 절대 하지 않고, 항상 가능성의 언어(…일 수 있음)를 쓴다.",
    "observedSignals에는 대화에서 실제로 관찰된 공부·생활 근거를 2~3개 담고, 각 근거를 제공된 행동지표 키 중 가장 관련된 하나에 연결한다(애매하면 빈 문자열).",
    "rationale은 이 근거들이 해당 유형·공부 방식과 어떻게 이어지는지 1~2문장으로 보충 설명한다(단정 금지).",
    "출력은 반드시 주어진 JSON 스키마를 따른다.",
  ].join(" ");
}

// 타임아웃 경쟁 래퍼. SDK 자체 abort 지원 여부와 무관하게 상한 지연을 보장한다.
function withTimeout(promise, ms) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error("llm_timeout")), ms)),
  ]);
}

function statusOf(error) {
  return error?.status ?? error?.code ?? error?.response?.status ?? null;
}

// 429(쿼터)·503(과부하)는 일시적, 404(모델 폐기·계정별 미제공)는 영구적이지만 둘 다 "이 모델만" 문제이므로
// 다음 모델로 넘어간다. 그 외 오류(인증·요청 형식 등)는 재시도 이득이 적어 즉시 중단.
//
// llm_timeout 도 "이 모델만" 문제로 본다(2026-07-28 실측): flash-latest 는 구조화 출력에서 6~8초가 기본이라
// 입력이 조금만 길어지면 12초 상한을 넘긴다. 그런데 타임아웃 오류에는 status 가 없어서 예전에는
// isRetriable=false 로 즉시 포기했고, 실측 1.5초로 훨씬 빠른 flash-lite-latest 를 시도조차 하지 않았다.
// 결과적으로 AI 기능이 조용히 규칙 폴백으로 떨어졌다. 재시도해도 MODEL_CHAIN 길이만큼만 도니 무한루프는 없다.
function isRetriable(error) {
  if (error?.message === "llm_timeout") {
    return true;
  }
  const status = Number(statusOf(error));
  return status === 429 || status === 503 || status === 404;
}

// 대화 원문 → 간이 추정 JSON. 실패 시 null(호출부가 규칙 폴백).
// options.knownMbti(16유형)가 오면 "보충 모드": 유형은 유지하고 근거(observedSignals·rationale)만 만든다.
export async function estimateMbtiFromChat(messages = [], options = {}) {
  if (!isLlmAvailable) {
    return null;
  }
  const rawKnown = typeof options.knownMbti === "string" ? options.knownMbti.trim().toUpperCase() : "";
  const knownMbti = MBTI_TYPES.has(rawKnown) ? rawKnown : "";
  const systemInstruction = knownMbti ? buildSupplementInstruction(knownMbti) : SYSTEM_INSTRUCTION;
  const ai = new GoogleGenAI({ apiKey: API_KEY });
  const contents = messages
    .filter((m) => m && typeof m.text === "string" && m.text.trim())
    .map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.text.slice(0, 1000) }],
    }));

  if (contents.length === 0) {
    return null;
  }

  for (const model of MODEL_CHAIN) {
    try {
      const response = await withTimeout(
        ai.models.generateContent({
          model,
          contents,
          config: {
            systemInstruction,
            responseMimeType: "application/json",
            responseSchema: ESTIMATE_SCHEMA,
            temperature: 0.4,
          },
        }),
        CALL_TIMEOUT_MS,
      );

      const parsed = safeParseJson(response?.text);
      const validated = validateEstimate(parsed);
      if (validated) {
        // 보충 모드는 유형을 바꾸지 않는다 — 모델 응답과 무관하게 확정 유형을 유지한다.
        return { ...validated, mbti: knownMbti || validated.mbti, model };
      }
      // JSON 은 왔지만 계약 위반 → 폴백(다음 모델로 넘기지 않고 종료: 재호출 이득 적음).
      console.warn(`[llm] ${model}: 출력 계약 위반 → 규칙 폴백`);
      return null;
    } catch (error) {
      if (isRetriable(error)) {
        // 로그가 없으면 배포 환경에서 AI가 조용히 죽어도 알 수 없다(Render 로그가 유일한 관측 지점).
        console.warn(`[llm] ${model} 실패(재시도 가능): ${error.message} · status=${statusOf(error) ?? "없음"}`);
        continue; // 다음 모델 시도(배열 끝나면 루프 종료 → 무한루프 없음).
      }
      console.warn(`[llm] ${model} 실패(중단): ${error.message} · status=${statusOf(error) ?? "없음"}`);
      return null; // 비재시도성 오류 → 규칙 폴백.
    }
  }
  console.warn(`[llm] 모든 모델(${MODEL_CHAIN.join(", ")}) 소진 → 규칙 폴백`);
  return null;
}

function safeParseJson(text) {
  if (!text || typeof text !== "string") {
    return null;
  }
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

// 서버측 출력 검증: mbti 는 16유형만, disallowed_check 필수 통과. 위반 시 null.
function validateEstimate(obj) {
  if (!obj || typeof obj !== "object") {
    return null;
  }
  if (obj.disallowed_check !== true) {
    return null;
  }
  const rawMbti = typeof obj.mbti === "string" ? obj.mbti.trim().toUpperCase() : "";
  const mbti = MBTI_TYPES.has(rawMbti) ? rawMbti : null;
  return {
    mbti, // null 이면 "불명확" — 호출부가 규칙 설문으로 유도
    confidence: obj.confidence === "mid" ? "mid" : "low",
    rationale: typeof obj.rationale === "string" ? obj.rationale.slice(0, 400) : "",
    uncertainty: typeof obj.uncertainty === "string" ? obj.uncertainty.slice(0, 300) : "",
    observedSignals: sanitizeObservedSignals(obj.observedSignals),
  };
}

// 관찰 근거 정제: 배열·문자열 안전 파싱, 최대 3개, 지표 키는 화이트리스트만 통과(아니면 빈 문자열).
function sanitizeObservedSignals(raw) {
  if (!Array.isArray(raw)) {
    return [];
  }
  return raw
    .filter((item) => item && typeof item === "object" && typeof item.signal === "string" && item.signal.trim())
    .slice(0, 3)
    .map((item) => {
      const indicator = typeof item.indicator === "string" ? item.indicator.trim() : "";
      return {
        signal: item.signal.trim().slice(0, 120),
        indicator: INDICATOR_KEYS.includes(indicator) ? indicator : "",
      };
    });
}
