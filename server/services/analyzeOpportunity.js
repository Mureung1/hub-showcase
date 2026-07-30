import {
  geminiAnalyzeOpportunity,
  getFriendlyGeminiError,
} from "./geminiAnalyzeOpportunity.js";
import { mockAnalyzeOpportunity } from "./mockAnalyzeOpportunity.js";
import { analyzeResponseSchema } from "../schemas/analyzeSchemas.js";
import { normalizeAnalysisResult } from "../../src/utils/normalizeAnalysisResult.js";
import { matchOpportunity } from "../../src/services/matchOpportunity.js";
import { createTasks } from "./createTasks.js";
import { sortTasksByUpcomingDate } from "../../src/utils/taskSchedule.js";
import {
  getFriendlyOpenAIError,
  openaiAnalyzeOpportunity,
} from "./openaiAnalyzeOpportunity.js";

const defaultServices = Object.freeze({
  geminiAnalyzeOpportunity,
  mockAnalyzeOpportunity,
  openaiAnalyzeOpportunity,
});

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
    process.env.ALLOW_LIVE_GEMINI === "true" &&
    Boolean(process.env.GEMINI_API_KEY)
  );
}

function getDisabledOpenAIState() {
  if (!isOpenAIRequested()) {
    return null;
  }

  if (process.env.ALLOW_LIVE_OPENAI !== "true") {
    return {
      message: "실제 OpenAI API 사용이 비활성화되어 mock 결과를 표시합니다.",
      reason: "OpenAI API 호출 비활성화",
    };
  }

  if (!process.env.OPENAI_API_KEY) {
    return {
      message: "OpenAI API 키가 설정되지 않아 mock 결과를 표시합니다.",
      reason: "OpenAI API 키 없음",
    };
  }

  return null;
}

function getDisabledGeminiState() {
  if (!isGeminiRequested()) {
    return null;
  }

  if (process.env.ALLOW_LIVE_GEMINI !== "true") {
    return {
      message: "실제 Gemini API 사용이 비활성화되어 mock 결과를 표시합니다.",
      reason: "Gemini API 호출 비활성화",
    };
  }

  if (!process.env.GEMINI_API_KEY) {
    return {
      message: "Gemini API 키가 설정되지 않아 mock 결과를 표시합니다.",
      reason: "Gemini API 키 없음",
    };
  }

  return null;
}

function getDisabledAIState() {
  const provider = getAIProvider();

  if (provider === "openai") {
    return getDisabledOpenAIState();
  }

  if (provider === "gemini") {
    return getDisabledGeminiState();
  }

  if (provider !== "mock") {
    return {
      message: `AI_PROVIDER=${provider}는 아직 지원하지 않아 mock 결과를 표시합니다.`,
      reason: "지원하지 않는 AI 공급자",
    };
  }

  return null;
}

function finalizeAnalysisResult(result, profile, rawText = "") {
  const normalizedResult = normalizeAnalysisResult(result);
  const match = matchOpportunity({
    profile,
    opportunity: normalizedResult.opportunity,
    sourceText: rawText,
  });
  const generatedTasks = normalizedResult.mode === "gemini" ? normalizedResult.tasks : [];
  const tasks = sortTasksByUpcomingDate(
    generatedTasks.length ? generatedTasks : createTasks(normalizedResult.opportunity, match),
  );

  return analyzeResponseSchema.parse(normalizeAnalysisResult({
    ...normalizedResult,
    match,
    tasks,
  }));
}

function attachMockFallback(result, fallbackState) {
  if (!fallbackState) {
    return {
      ...result,
      fallbackUsed: false,
      fallbackReason: null,
    };
  }

  return {
    ...result,
    fallbackUsed: true,
    fallbackReason: fallbackState.reason,
  };
}

export function getAIConfig() {
  const aiProvider = getAIProvider();
  const liveOpenAIEnabled = isLiveOpenAIEnabled();
  const liveGeminiEnabled = isLiveGeminiEnabled();

  return {
    aiProvider,
    provider: aiProvider,
    geminiConfigured: Boolean(process.env.GEMINI_API_KEY),
    openAIConfigured: Boolean(process.env.OPENAI_API_KEY),
    liveAIEnabled: liveOpenAIEnabled || liveGeminiEnabled,
    liveGeminiEnabled,
    liveOpenAIEnabled,
  };
}

export async function analyzeOpportunity(payload, serviceOverrides = {}) {
  const services = {
    ...defaultServices,
    ...serviceOverrides,
  };
  const config = getAIConfig();

  if (config.liveGeminiEnabled) {
    try {
      const result = await services.geminiAnalyzeOpportunity(payload);
      return finalizeAnalysisResult(result, payload.profile, payload.rawText);
    } catch (error) {
      const fallbackResult = await services.mockAnalyzeOpportunity(payload);
      return finalizeAnalysisResult(attachMockFallback(fallbackResult, {
        message: getFriendlyGeminiError(error),
        reason: "Gemini API 요청 실패",
      }), payload.profile, payload.rawText);
    }
  }

  if (config.liveOpenAIEnabled) {
    try {
      const result = await services.openaiAnalyzeOpportunity(payload);
      return finalizeAnalysisResult(result, payload.profile, payload.rawText);
    } catch (error) {
      const fallbackResult = await services.mockAnalyzeOpportunity(payload);
      return finalizeAnalysisResult(attachMockFallback(fallbackResult, {
        message: getFriendlyOpenAIError(error),
        reason: "OpenAI API 요청 실패",
      }), payload.profile, payload.rawText);
    }
  }

  const fallbackResult = await services.mockAnalyzeOpportunity(payload);
  return finalizeAnalysisResult(
    attachMockFallback(fallbackResult, getDisabledAIState()),
    payload.profile,
    payload.rawText,
  );
}
