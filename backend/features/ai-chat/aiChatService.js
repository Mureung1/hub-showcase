import { AI_CHAT_LIMITS } from "../../../shared/contracts/aiChatContract.js";

const DEFAULT_MODEL = "gemini-2.5-flash-lite";
const DEFAULT_TIMEOUT_MS = 8_000;
const URGENT_PATTERN = /죽고\s*싶|사라지고\s*싶|자해|극단적\s*선택/;
const URGENT_RESPONSE =
  "지금 혼자 감당하기 어려운 상태로 들려. 다칠 가능성이 있다면 혼자 있지 말고, 바로 가까운 사람이나 지역 응급 의료기관에 현재 상황을 알려줘.";

export class AiGenerationError extends Error {
  constructor(code, message, { status = 502, cause } = {}) {
    super(message, { cause });
    this.name = "AiGenerationError";
    this.code = code;
    this.status = status;
  }
}

function compactAnalysis(analysis) {
  const scores = Array.isArray(analysis?.scores)
    ? analysis.scores
        .slice(0, 5)
        .map(({ label, value }) => ({ label, value }))
    : [];
  const possibleStates = Array.isArray(analysis?.possibleStates)
    ? analysis.possibleStates
        .slice(0, 3)
        .map(({ label, reason }) => ({ label, reason }))
    : [];

  return { scores, possibleStates };
}

function buildSystemInstruction() {
  return [
    "너는 사용자의 감정을 단정하지 않고 함께 정리하는 한국어 대화형 AI다.",
    "답변은 2~4문장, 350자 이내의 자연스러운 구어체로 작성한다.",
    "사용자가 쓴 사실·수치·고유명사의 의미를 바꾸거나 없는 사실을 만들지 않는다.",
    "감정 분석값은 관찰 신호일 뿐 진단이 아니므로 '~일 수 있어', '~처럼 들려'라고 표현한다.",
    "공감 한 문장 뒤에 도움이 되는 질문이나 작은 행동 하나만 제안한다.",
    "불릿, 제목, 이모지, 과장된 위로, 기계적인 결론 문구를 쓰지 않는다.",
    "'결론적으로', '정리하자면', '이를 통해', '~에 대해', '~할 수 있습니다' 같은 번역투와 AI 상투어를 피한다.",
    "같은 길이와 종결어미를 반복하지 말고, 사용자의 존댓말/반말 수준을 자연스럽게 따른다.",
    "의료 진단이나 치료를 대신한다고 말하지 않는다."
  ].join("\n");
}

function toGeminiContents(recentMessages, message, analysis) {
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
            "[브라우저에서 계산한 참고용 감정 요약]",
            JSON.stringify(compactAnalysis(analysis))
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

export function createGeminiChatGenerator({
  apiKey = process.env.GEMINI_API_KEY,
  model = process.env.GEMINI_MODEL || DEFAULT_MODEL,
  fetchImpl = globalThis.fetch,
  timeoutMs = DEFAULT_TIMEOUT_MS
} = {}) {
  return async function generateAiChatResponse({
    message,
    recentMessages = [],
    analysis = {}
  }) {
    if (URGENT_PATTERN.test(message)) {
      return { response: URGENT_RESPONSE, source: "safety" };
    }

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
            contents: toGeminiContents(recentMessages, message, analysis),
            generationConfig: {
              temperature: 0.7,
              maxOutputTokens: 300
            }
          }),
          signal: controller.signal
        }
      );

      if (!response.ok) {
        throw new AiGenerationError(
          response.status === 429 ? "AI_RATE_LIMITED" : "AI_PROVIDER_ERROR",
          "The generative AI provider rejected the request.",
          { status: response.status === 429 ? 429 : 502 }
        );
      }

      const generatedText = readGeneratedText(await response.json());
      if (!generatedText) {
        throw new AiGenerationError(
          "AI_EMPTY_RESPONSE",
          "The generative AI provider returned an empty response."
        );
      }

      return {
        response: generatedText.slice(0, AI_CHAT_LIMITS.responseLength),
        source: "gemini"
      };
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

