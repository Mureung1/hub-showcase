import {
  AI_CHAT_LIMITS
} from "../../../../../shared/contracts/aiChatContract";

const DEFAULT_API_BASE_URL = "";
const configuredApiBaseUrl =
  import.meta.env.VITE_API_BASE_URL || DEFAULT_API_BASE_URL;

export class AiChatApiError extends Error {
  constructor(message, { status, code } = {}) {
    super(message);
    this.name = "AiChatApiError";
    this.status = status;
    this.code = code;
  }
}

export function createAiChatApi({
  baseUrl = configuredApiBaseUrl,
  fetchImpl = (...args) => globalThis.fetch(...args)
} = {}) {
  const normalizedBaseUrl = String(baseUrl || DEFAULT_API_BASE_URL).replace(
    /\/+$/,
    ""
  );
  const endpoint = `${normalizedBaseUrl}/api/ai-chat/responses`;

  async function generateAiResponse(
    { message, recentMessages = [], analysis = {} },
    { signal, guestKey } = {}
  ) {
    if (!guestKey) {
      throw new AiChatApiError("A guest key is required.", {
        status: 401,
        code: "GUEST_AUTH_REQUIRED"
      });
    }

    const response = await fetchImpl(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Guest-Key": guestKey
      },
      body: JSON.stringify({
        message,
        recentMessages: recentMessages
          .filter(
            (item) =>
              (item?.role === "user" || item?.role === "ai") &&
              typeof item.content === "string"
          )
          .slice(-AI_CHAT_LIMITS.recentMessageCount)
          .map(({ role, content }) => ({ role, content })),
        analysis
      }),
      signal
    });

    let payload;
    try {
      payload = await response.json();
    } catch {
      throw new AiChatApiError("The AI API returned invalid JSON.", {
        status: response.status,
        code: "INVALID_API_RESPONSE"
      });
    }

    if (!response.ok || payload.success !== true) {
      throw new AiChatApiError(
        payload.error?.message || "The AI response request failed.",
        {
          status: response.status,
          code: payload.error?.code || "AI_REQUEST_FAILED"
        }
      );
    }

    const generatedText = payload.data?.response;
    if (typeof generatedText !== "string" || !generatedText.trim()) {
      throw new AiChatApiError("The AI API returned an empty response.", {
        status: 502,
        code: "INVALID_API_RESPONSE"
      });
    }

    return generatedText.trim();
  }

  return { generateAiResponse };
}

const defaultApi = createAiChatApi();

export const generateAiResponse = (...args) =>
  defaultApi.generateAiResponse(...args);

