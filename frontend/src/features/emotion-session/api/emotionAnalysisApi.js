const DEFAULT_API_BASE_URL = "http://127.0.0.1:3000";
const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || DEFAULT_API_BASE_URL).replace(
  /\/$/,
  ""
);
const EMOTION_ANALYSIS_ENDPOINT = `${API_BASE_URL}/api/emotion-analyses`;

export class EmotionAnalysisApiError extends Error {
  constructor(message, { status, code, details } = {}) {
    super(message);
    this.name = "EmotionAnalysisApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

async function requestJson(url, options = {}) {
  const response = await fetch(url, options);
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

export async function createEmotionAnalysis(payload, { signal } = {}) {
  const result = await requestJson(EMOTION_ANALYSIS_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    signal
  });
  const emotionAnalysis = result.data?.emotionAnalysis;

  if (!emotionAnalysis) {
    throw new EmotionAnalysisApiError("The API response does not include the created record.", {
      status: 502,
      code: "INVALID_API_RESPONSE"
    });
  }

  return emotionAnalysis;
}

export async function listEmotionAnalyses(sessionId, { limit = 20, signal } = {}) {
  const searchParams = new URLSearchParams({
    sessionId,
    limit: String(limit)
  });
  const result = await requestJson(`${EMOTION_ANALYSIS_ENDPOINT}?${searchParams}`, { signal });
  const emotionAnalyses = result.data?.emotionAnalyses;

  if (!Array.isArray(emotionAnalyses)) {
    throw new EmotionAnalysisApiError("The API response does not include a record list.", {
      status: 502,
      code: "INVALID_API_RESPONSE"
    });
  }

  return emotionAnalyses;
}
