import {
  AI_CHAT_LIMITS,
  AI_EMOTION_KEYS,
  AI_RESPONSE_APPROACHES
} from "../../../shared/contracts/aiChatContract.js";

const DEFAULT_MODEL = "gemini-2.5-flash-lite";
const DEFAULT_TIMEOUT_MS = 10_000;
const URGENT_PATTERN = /죽고\s*싶|사라지고\s*싶|자해|극단적\s*선택/;
const URGENT_RESPONSE =
  "지금 혼자 감당하기 어려운 상태로 들려. 다칠 가능성이 있다면 혼자 있지 말고, 바로 가까운 사람이나 지역 응급 의료기관에 현재 상황을 알려줘.";

const EMOTION_LABELS = Object.freeze({
  anxiety: "불안",
  sadness: "슬픔",
  anger: "분노",
  joy: "기쁨",
  neutral: "평온"
});

const RESPONSE_SCHEMA = {
  type: "OBJECT",
  required: [
    "response",
    "scores",
    "possibleStates",
    "evidence",
    "responseApproach",
    "needsConfirmation"
  ],
  properties: {
    response: { type: "STRING" },
    scores: {
      type: "OBJECT",
      required: AI_EMOTION_KEYS,
      properties: Object.fromEntries(
        AI_EMOTION_KEYS.map((key) => [
          key,
          { type: "INTEGER", minimum: 0, maximum: 100 }
        ])
      )
    },
    possibleStates: {
      type: "ARRAY",
      maxItems: 3,
      items: {
        type: "OBJECT",
        required: ["label", "confidence"],
        properties: {
          label: { type: "STRING" },
          confidence: { type: "NUMBER", minimum: 0, maximum: 1 }
        }
      }
    },
    evidence: {
      type: "ARRAY",
      maxItems: 4,
      items: { type: "STRING" }
    },
    responseApproach: {
      type: "STRING",
      enum: AI_RESPONSE_APPROACHES
    },
    needsConfirmation: { type: "BOOLEAN" }
  }
};

export class AiGenerationError extends Error {
  constructor(code, message, { status = 502, cause } = {}) {
    super(message, { cause });
    this.name = "AiGenerationError";
    this.code = code;
    this.status = status;
  }
}

function buildSystemInstruction() {
  return [
    "너는 사용자의 감정을 단정하지 않고 함께 정리하는 한국어 대화형 AI다.",
    "사용자 글과 얼굴 움직임 참고 신호를 함께 보고 불안, 슬픔, 분노, 기쁨, 평온 점수를 추정한다.",
    "감정 점수 다섯 개의 합은 반드시 100이어야 한다.",
    "얼굴 움직임은 내적 감정을 확정하는 증거가 아니며 글의 맥락보다 우선하지 않는다.",
    "근거에는 입력에 실제로 존재하는 글 또는 움직임 신호만 적는다.",
    "답변은 2~4문장, 350자 이내의 자연스러운 구어체로 작성한다.",
    "감정 분석은 관찰 참고값일 뿐 진단이 아니므로 '~일 수 있어', '~처럼 들려'라고 표현한다.",
    "공감 한 문장 뒤에 도움이 되는 질문이나 작은 행동 하나만 제안한다.",
    "불릿, 제목, 이모지, 과장된 위로, 기계적인 결론 문구를 쓰지 않는다.",
    "사용자의 존댓말이나 반말 수준을 자연스럽게 따른다.",
    "의료 진단이나 치료를 대신한다고 말하지 않는다."
  ].join("\n");
}

function toGeminiContents(recentMessages, message, signals) {
  const history = recentMessages.map((item) => ({
    role: item.role === "ai" ? "model" : "user",
    parts: [{ text: item.content }]
  }));

  return [
    ...history,
    {
      role: "user",
      parts: [
        {
          text: [
            message,
            "",
            "[기기에서 추출한 참고 신호—영상과 얼굴 좌표는 포함되지 않음]",
            JSON.stringify(signals)
          ].join("\n")
        }
      ]
    }
  ];
}

function readGeneratedText(payload) {
  return payload?.candidates?.[0]?.content?.parts
    ?.map((part) => (typeof part.text === "string" ? part.text : ""))
    .join("")
    .trim();
}

function normalizeScores(scores) {
  const values = AI_EMOTION_KEYS.map((key) =>
    Math.max(0, Number.isFinite(Number(scores?.[key])) ? Number(scores[key]) : 0)
  );
  const total = values.reduce((sum, value) => sum + value, 0);

  if (total <= 0) {
    throw new AiGenerationError(
      "AI_INVALID_RESPONSE",
      "The generative AI provider returned invalid emotion scores."
    );
  }

  const exact = values.map((value) => (value / total) * 100);
  const rounded = exact.map(Math.floor);
  const remainder = 100 - rounded.reduce((sum, value) => sum + value, 0);
  const order = exact
    .map((value, index) => ({ index, fraction: value - Math.floor(value) }))
    .sort((left, right) => right.fraction - left.fraction);

  for (let index = 0; index < remainder; index += 1) {
    rounded[order[index].index] += 1;
  }

  return AI_EMOTION_KEYS.map((key, index) => ({
    key,
    label: EMOTION_LABELS[key],
    score: rounded[index]
  })).sort((left, right) => right.score - left.score);
}

function readStructuredResult(payload, message) {
  let parsed;

  try {
    parsed = JSON.parse(readGeneratedText(payload));
  } catch {
    throw new AiGenerationError(
      "AI_INVALID_RESPONSE",
      "The generative AI provider returned invalid structured data."
    );
  }

  if (
    typeof parsed?.response !== "string" ||
    !parsed.response.trim() ||
    !AI_RESPONSE_APPROACHES.includes(parsed.responseApproach)
  ) {
    throw new AiGenerationError(
      "AI_INVALID_RESPONSE",
      "The generative AI provider returned incomplete structured data."
    );
  }

  return {
    response: parsed.response.trim().slice(0, AI_CHAT_LIMITS.responseLength),
    analysis: {
      inputText: message,
      scores: normalizeScores(parsed.scores),
      possibleStates: Array.isArray(parsed.possibleStates)
        ? parsed.possibleStates.slice(0, 3).map((state) => ({
            label: String(state?.label || "").slice(0, 80),
            confidence: Math.min(1, Math.max(0, Number(state?.confidence) || 0))
          }))
        : [],
      evidence: Array.isArray(parsed.evidence)
        ? parsed.evidence.slice(0, 4).map((item) => String(item).slice(0, 160))
        : [],
      responseApproach: parsed.responseApproach,
      needsConfirmation: Boolean(parsed.needsConfirmation)
    },
    source: "gemini"
  };
}

function createSafetyResult(message) {
  return {
    response: URGENT_RESPONSE,
    analysis: {
      inputText: message,
      scores: [
        { key: "anxiety", label: "불안", score: 50 },
        { key: "sadness", label: "슬픔", score: 35 },
        { key: "neutral", label: "평온", score: 10 },
        { key: "anger", label: "분노", score: 3 },
        { key: "joy", label: "기쁨", score: 2 }
      ],
      possibleStates: [{ label: "즉각적인 안전 확인 필요", confidence: 1 }],
      evidence: ["사용자 문장에서 안전과 관련된 직접 표현이 감지됨"],
      responseApproach: "keep_brief",
      needsConfirmation: true
    },
    source: "safety"
  };
}

function mapProviderRejection(status) {
  if (status === 429) {
    return {
      code: "AI_RATE_LIMITED",
      message: "The generative AI provider rate limit has been reached.",
      status: 429
    };
  }
  if (status === 401 || status === 403) {
    return {
      code: "AI_PROVIDER_AUTH_FAILED",
      message: "The generative AI provider credentials were rejected.",
      status: 503
    };
  }
  if (status === 404) {
    return {
      code: "AI_MODEL_NOT_FOUND",
      message: "The configured generative AI model is unavailable.",
      status: 503
    };
  }
  if (status === 400) {
    return {
      code: "AI_PROVIDER_REQUEST_INVALID",
      message: "The generative AI provider rejected the request format.",
      status: 502
    };
  }
  return {
    code: "AI_PROVIDER_ERROR",
    message: "The generative AI provider rejected the request.",
    status: 502
  };
}

export function createGeminiChatGenerator({
  apiKey = process.env.GEMINI_API_KEY,
  model = process.env.GEMINI_MODEL || DEFAULT_MODEL,
  fetchImpl = globalThis.fetch,
  timeoutMs = DEFAULT_TIMEOUT_MS
} = {}) {
  return async function generateAiChatResponse({
    message,
    recentMessages = [],
    signals = {}
  }) {
    if (URGENT_PATTERN.test(message)) return createSafetyResult(message);

    if (typeof apiKey !== "string" || !apiKey.trim()) {
      throw new AiGenerationError(
        "AI_NOT_CONFIGURED",
        "The generative AI service is not configured.",
        { status: 503 }
      );
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetchImpl(
        `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-goog-api-key": apiKey
          },
          body: JSON.stringify({
            systemInstruction: {
              parts: [{ text: buildSystemInstruction() }]
            },
            contents: toGeminiContents(recentMessages, message, signals),
            generationConfig: {
              temperature: 0.6,
              maxOutputTokens: 650,
              responseMimeType: "application/json",
              responseSchema: RESPONSE_SCHEMA
            }
          }),
          signal: controller.signal
        }
      );

      if (!response.ok) {
        const rejection = mapProviderRejection(response.status);
        throw new AiGenerationError(rejection.code, rejection.message, {
          status: rejection.status
        });
      }

      const payload = await response.json();
      if (!readGeneratedText(payload)) {
        throw new AiGenerationError(
          "AI_EMPTY_RESPONSE",
          "The generative AI provider returned an empty response."
        );
      }

      return readStructuredResult(payload, message);
    } catch (error) {
      if (error instanceof AiGenerationError) throw error;
      if (error?.name === "AbortError") {
        throw new AiGenerationError(
          "AI_TIMEOUT",
          "The generative AI request timed out.",
          { status: 504, cause: error }
        );
      }
      throw new AiGenerationError(
        "AI_PROVIDER_UNAVAILABLE",
        "The generative AI provider is unavailable.",
        { status: 502, cause: error }
      );
    } finally {
      clearTimeout(timeout);
    }
  };
}
