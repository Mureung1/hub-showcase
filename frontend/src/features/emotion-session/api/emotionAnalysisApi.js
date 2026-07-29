import {
  EMOTION_ANALYSIS_LIMITS
} from "../../../../../shared/contracts/emotionAnalysisContract";

const DEFAULT_API_BASE_URL = "";
const configuredApiBaseUrl =
  import.meta.env.VITE_API_BASE_URL || DEFAULT_API_BASE_URL;

export class EmotionAnalysisApiError extends Error {
  constructor(message, { status, code, details } = {}) {
    super(message);
    this.name = "EmotionAnalysisApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

async function requestJson(fetchImpl, url, options = {}) {
  const response = await fetchImpl(url, options);
  let payload;

  try {
    payload = await response.json();
  } catch {
    throw new EmotionAnalysisApiError("The API returned an invalid JSON response.", {
      status: response.status,
      code: "INVALID_API_RESPONSE"
    });
  }

  if (!response.ok || payload.success !== true) {
    throw new EmotionAnalysisApiError(
      payload.error?.message || "The emotion analysis API request failed.",
      {
        status: response.status,
        code: payload.error?.code || "API_REQUEST_FAILED",
        details: payload.error?.details
      }
    );
  }

  return payload;
}

export function createEmotionAnalysisApi({
  baseUrl = configuredApiBaseUrl,
  fetchImpl = (...args) => globalThis.fetch(...args)
} = {}) {
  if (typeof fetchImpl !== "function") {
    throw new TypeError("fetchImpl must be a function.");
  }

  const normalizedBaseUrl = String(baseUrl || DEFAULT_API_BASE_URL).replace(
    /\/+$/,
    ""
  );
  const endpoint = `${normalizedBaseUrl}/api/emotion-analyses`;

  async function createEmotionAnalysis(payload, { signal, guestKey } = {}) {
    const result = await requestJson(fetchImpl, endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(guestKey ? { "X-Guest-Key": guestKey } : {})
      },
      body: JSON.stringify(payload),
      signal
    });
    const emotionAnalysis = result.data?.emotionAnalysis;

    if (!emotionAnalysis) {
      throw new EmotionAnalysisApiError(
        "The API response does not include the created record.",
        {
          status: 502,
          code: "INVALID_API_RESPONSE"
        }
      );
    }

    return emotionAnalysis;
  }

  async function listEmotionAnalyses(
    { limit = EMOTION_ANALYSIS_LIMITS.historyLimit, signal, guestKey } = {}
  ) {
    const searchParams = new URLSearchParams({ limit: String(limit) });
    const result = await requestJson(
      fetchImpl,
      `${endpoint}?${searchParams}`,
      {
        signal,
        headers: guestKey ? { "X-Guest-Key": guestKey } : {}
      }
    );
    const emotionAnalyses = result.data?.emotionAnalyses;

    if (!Array.isArray(emotionAnalyses)) {
      throw new EmotionAnalysisApiError(
        "The API response does not include a record list.",
        {
          status: 502,
          code: "INVALID_API_RESPONSE"
        }
      );
    }

    return emotionAnalyses;
  }

  return {
    createEmotionAnalysis,
    listEmotionAnalyses
  };
}

const defaultApi = createEmotionAnalysisApi();

export const createEmotionAnalysis = (...args) =>
  defaultApi.createEmotionAnalysis(...args);

export const listEmotionAnalyses = (...args) =>
  defaultApi.listEmotionAnalyses(...args);
