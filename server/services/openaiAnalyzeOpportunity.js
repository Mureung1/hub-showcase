import OpenAI from "openai";
import {
  providerAnalysisJsonSchema,
  analyzeResponseSchema,
} from "../schemas/analyzeSchemas.js";
import { createTasks } from "./createTasks.js";
import { normalizeAnalysisResult } from "../../src/utils/normalizeAnalysisResult.js";

function readResponseText(response) {
  if (response.output_text) {
    return response.output_text;
  }

  const firstText = response.output
    ?.flatMap((item) => item.content ?? [])
    ?.find((content) => content.type === "output_text" || content.type === "text")
    ?.text;

  return firstText || "";
}

export function getFriendlyOpenAIError(error) {
  const code = error?.code || error?.error?.code;
  const status = error?.status;

  if (code === "insufficient_quota") {
    return "OpenAI API 크레딧 또는 quota가 부족해 실제 AI 분석을 사용할 수 없습니다.";
  }

  if (code === "rate_limit_exceeded" || status === 429) {
    return "OpenAI API 요청 한도에 도달해 잠시 실제 AI 분석을 사용할 수 없습니다.";
  }

  if (code === "invalid_api_key" || status === 401) {
    return "OpenAI API 키가 올바르지 않아 실제 AI 분석을 사용할 수 없습니다.";
  }

  if (status === 403) {
    return "현재 API 키 권한으로 실제 AI 분석을 사용할 수 없습니다.";
  }

  return "현재 실제 AI 분석을 사용할 수 없어 mock 결과를 표시합니다.";
}

export async function openaiAnalyzeOpportunity({ profile, rawText, url }) {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error("OPENAI_API_KEY가 없어 실제 AI 분석을 사용할 수 없습니다.");
  }

  const client = new OpenAI({ apiKey });
  const model = process.env.OPENAI_MODEL || "gpt-5.4-mini";
  const response = await client.responses.create({
    model,
    input: [
      {
        role: "system",
        content:
          "너는 대학생 맞춤형 장학금, 공모전, 지원사업 추천 에이전트다. 공고 본문에 없는 내용은 절대 추측하지 말고 null, uncertainFields, missingInfo에 넣어라. 지원 가능성은 eligible, conditionally_eligible, not_eligible, insufficient_info 중 하나로만 분류하라. profile이 null이면 적합성을 판정하지 말고 공고 핵심 정보만 추출하며 match는 insufficient_info와 score null로 반환하라. 모든 답변은 한국어로 작성하라.",
      },
      {
        role: "user",
        content: JSON.stringify({
          profile,
          sourceUrl: url || null,
          rawText,
        }),
      },
    ],
    text: {
      format: {
        type: "json_schema",
        name: "opportunity_analysis",
        schema: providerAnalysisJsonSchema,
        strict: true,
      },
    },
  });

  const outputText = readResponseText(response);
  const parsed = JSON.parse(outputText);
  const withoutTasks = {
    ...parsed,
    mode: "openai",
  };
  const normalized = normalizeAnalysisResult({
    ...withoutTasks,
    tasks: createTasks(withoutTasks.opportunity, withoutTasks.match),
  });

  return analyzeResponseSchema.parse(normalized);
}
