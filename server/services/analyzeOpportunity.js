import {
  geminiAnalyzeOpportunity,
  getFriendlyGeminiError,
} from "./geminiAnalyzeOpportunity.js";
import { mockAnalyzeOpportunity } from "./mockAnalyzeOpportunity.js";
import {
  getFriendlyOpenAIError,
  openaiAnalyzeOpportunity,
} from "./openaiAnalyzeOpportunity.js";

function getAIProvider() {
  return (process.env.AI_PROVIDER || "mock").trim().toLowerCase();
}

function isOpenAIRequested() {
  return getAIProvider() === "openai";
}

function isGeminiRequested() {
  return getAIProvider() === "gemini";
}

function isLiveOpenAIEnabled() {
  return (
    isOpenAIRequested() &&
    process.env.ALLOW_LIVE_OPENAI === "true" &&
    Boolean(process.env.OPENAI_API_KEY)
  );
}

function isLiveGeminiEnabled() {
  return (
    isGeminiRequested() &&
    process.env.ALLOW_LIVE_GEMINI !== "false" &&
    Boolean(process.env.GEMINI_API_KEY)
  );
}

function getDisabledOpenAIMessage() {
  if (!isOpenAIRequested()) {
    return null;
  }

  if (process.env.ALLOW_LIVE_OPENAI !== "true") {
    return "실제 OpenAI API 사용이 비활성화되어 mock 결과를 표시합니다.";
  }

  if (!process.env.OPENAI_API_KEY) {
    return "OPENAI_API_KEY가 없어 실제 AI 분석을 사용할 수 없습니다. mock 결과를 표시합니다.";
  }

  return null;
}

function getDisabledGeminiMessage() {
  if (!isGeminiRequested()) {
    return null;
  }

  if (process.env.ALLOW_LIVE_GEMINI === "false") {
    return "실제 Gemini API 사용이 비활성화되어 mock 결과를 표시합니다.";
  }

  if (!process.env.GEMINI_API_KEY) {
    return "GEMINI_API_KEY가 없어 실제 Gemini 분석을 사용할 수 없습니다. mock 결과를 표시합니다.";
  }

  return null;
}

function getDisabledAIMessage() {
  const provider = getAIProvider();

  if (provider === "openai") {
    return getDisabledOpenAIMessage();
  }

  if (provider === "gemini") {
    return getDisabledGeminiMessage();
  }

  if (provider !== "mock") {
    return `AI_PROVIDER=${provider}는 아직 지원하지 않아 mock 결과를 표시합니다.`;
  }

  return null;
}

function attachMockNotice(result, message) {
  if (!message) {
    return result;
  }

  return {
    ...result,
    match: {
      ...result.match,
      summary: `${message} ${result.match.summary}`,
      missingInfo: Array.from(new Set([message, ...result.match.missingInfo])),
    },
  };
}

export function getAIConfig() {
  const liveOpenAIEnabled = isLiveOpenAIEnabled();
  const liveGeminiEnabled = isLiveGeminiEnabled();

  return {
    aiProvider: getAIProvider(),
    liveAIEnabled: liveOpenAIEnabled || liveGeminiEnabled,
    liveGeminiEnabled,
    liveOpenAIEnabled,
  };
}

export async function analyzeOpportunity(payload) {
  const config = getAIConfig();

  if (config.liveGeminiEnabled) {
    try {
      return await geminiAnalyzeOpportunity(payload);
    } catch (error) {
      const fallbackResult = await mockAnalyzeOpportunity(payload);
      return attachMockNotice(fallbackResult, getFriendlyGeminiError(error));
    }
  }

  if (config.liveOpenAIEnabled) {
    try {
      return await openaiAnalyzeOpportunity(payload);
    } catch (error) {
      const fallbackResult = await mockAnalyzeOpportunity(payload);
      return attachMockNotice(fallbackResult, getFriendlyOpenAIError(error));
    }
  }

  const fallbackResult = await mockAnalyzeOpportunity(payload);
  return attachMockNotice(fallbackResult, getDisabledAIMessage());
}