import { mockAnalyzeOpportunity } from "./mockAnalyzeOpportunity.js";
import {
  getFriendlyOpenAIError,
  openaiAnalyzeOpportunity,
} from "./openaiAnalyzeOpportunity.js";

function isOpenAIRequested() {
  return process.env.AI_PROVIDER === "openai";
}

function isLiveOpenAIEnabled() {
  return (
    process.env.AI_PROVIDER === "openai" &&
    process.env.ALLOW_LIVE_OPENAI === "true" &&
    Boolean(process.env.OPENAI_API_KEY)
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
  return {
    aiProvider: process.env.AI_PROVIDER || "mock",
    liveOpenAIEnabled: isLiveOpenAIEnabled(),
  };
}

export async function analyzeOpportunity(payload) {
  const config = getAIConfig();

  if (!config.liveOpenAIEnabled) {
    const fallbackResult = await mockAnalyzeOpportunity(payload);
    return attachMockNotice(fallbackResult, getDisabledOpenAIMessage());
  }

  try {
    return await openaiAnalyzeOpportunity(payload);
  } catch (error) {
    const fallbackResult = await mockAnalyzeOpportunity(payload);
    return attachMockNotice(fallbackResult, getFriendlyOpenAIError(error));
  }
}
