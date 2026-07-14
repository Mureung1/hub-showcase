import { GoogleGenAI, Type } from "@google/genai";
import {
  providerAnalysisJsonSchema,
  providerAnalysisSchema,
  analyzeResponseSchema,
} from "../schemas/analyzeSchemas.js";
import { createTasks } from "./createTasks.js";
import { normalizeAnalysisResult } from "../../src/utils/normalizeAnalysisResult.js";

const DEFAULT_GEMINI_MODEL = "gemini-3-flash-preview";
const FALLBACK_GEMINI_MODEL = "gemini-2.5-flash";
const GEMINI_REQUEST_TIMEOUT_MS = 45000;

const JSON_TYPE_TO_GEMINI_TYPE = {
  array: Type.ARRAY,
  boolean: Type.BOOLEAN,
  integer: Type.INTEGER,
  number: Type.NUMBER,
  object: Type.OBJECT,
  string: Type.STRING,
};

function isPlainObject(value) {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function createAbortSignal() {
  return typeof AbortSignal !== "undefined" && typeof AbortSignal.timeout === "function"
    ? AbortSignal.timeout(GEMINI_REQUEST_TIMEOUT_MS)
    : undefined;
}

function convertJsonSchemaToGeminiSchema(schema) {
  if (!isPlainObject(schema)) {
    return schema;
  }

  const converted = {};
  const rawType = schema.type;
  let nullable = false;
  let nonNullTypes = [];

  if (Array.isArray(rawType)) {
    nullable = rawType.includes("null");
    nonNullTypes = rawType.filter((type) => type !== "null");
  } else if (rawType) {
    nonNullTypes = [rawType];
  }

  if (nonNullTypes.length === 1 && JSON_TYPE_TO_GEMINI_TYPE[nonNullTypes[0]]) {
    converted.type = JSON_TYPE_TO_GEMINI_TYPE[nonNullTypes[0]];
  } else if (nonNullTypes.length > 1) {
    converted.anyOf = nonNullTypes
      .filter((type) => JSON_TYPE_TO_GEMINI_TYPE[type])
      .map((type) => ({ type: JSON_TYPE_TO_GEMINI_TYPE[type] }));
  }

  if (nullable) {
    converted.nullable = true;
  }

  if (schema.description) converted.description = schema.description;
  if (schema.enum) converted.enum = schema.enum;
  if (schema.format) converted.format = schema.format;
  if (schema.minimum !== undefined) converted.minimum = schema.minimum;
  if (schema.maximum !== undefined) converted.maximum = schema.maximum;
  if (schema.required) converted.required = schema.required;

  if (schema.properties) {
    converted.properties = Object.fromEntries(
      Object.entries(schema.properties).map(([key, value]) => [
        key,
        convertJsonSchemaToGeminiSchema(value),
      ]),
    );
  }

  if (schema.items) {
    converted.items = convertJsonSchemaToGeminiSchema(schema.items);
  }

  if (schema.anyOf) {
    converted.anyOf = schema.anyOf.map(convertJsonSchemaToGeminiSchema);
  }

  if (schema.oneOf && !converted.anyOf) {
    converted.anyOf = schema.oneOf.map(convertJsonSchemaToGeminiSchema);
  }

  if (converted.type === Type.OBJECT && converted.required && !converted.propertyOrdering) {
    converted.propertyOrdering = converted.required;
  }

  return converted;
}

const geminiAnalyzeResponseSchema = convertJsonSchemaToGeminiSchema(providerAnalysisJsonSchema);

function readGeminiText(response) {
  return response.text || "";
}

function parseJsonOutput(outputText) {
  const trimmed = outputText.trim();
  const withoutFence = trimmed
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```$/i, "")
    .trim();

  return JSON.parse(withoutFence);
}

function getErrorStatus(error) {
  return error?.status || error?.response?.status;
}

function getErrorCode(error) {
  return error?.code || error?.error?.code;
}

function getErrorMessageText(error) {
  return String(error?.message || "").toLowerCase();
}

function isQuotaOrRateLimitError(error) {
  const status = getErrorStatus(error);
  const message = getErrorMessageText(error);

  return status === 429 || message.includes("quota") || message.includes("rate limit");
}

function isAuthOrPermissionError(error) {
  const status = getErrorStatus(error);
  const code = getErrorCode(error);
  const message = getErrorMessageText(error);

  return (
    status === 401 ||
    status === 403 ||
    code === "API_KEY_INVALID" ||
    message.includes("api key") ||
    message.includes("api_key") ||
    message.includes("permission")
  );
}

function isModelNotFoundError(error) {
  const status = getErrorStatus(error);
  const message = getErrorMessageText(error);

  return status === 404 || (message.includes("model") && message.includes("not found"));
}

function shouldRetryWithFallback(error, configuredModel) {
  return (
    configuredModel !== FALLBACK_GEMINI_MODEL &&
    !isQuotaOrRateLimitError(error) &&
    !isAuthOrPermissionError(error)
  );
}

function createAnalyzeRequest({ model, profile, rawText, url }) {
  return {
    model,
    contents: JSON.stringify(
      {
        profile,
        rawText,
        sourceUrl: url || null,
      },
      null,
      2,
    ),
    config: {
      abortSignal: createAbortSignal(),
      systemInstruction: `너는 대학생 대상 장학금, 공모전, 대외활동, 봉사, 지원사업 공고를 분석하는 시스템이다.
사용자 프로필과 공고 본문을 비교해 구조화된 결과를 반환한다.

규칙:
1. 공고문에 없는 내용은 추측하지 않는다.
2. 불확실한 내용은 uncertainFields 또는 missingInfo에 기록한다.
3. 우대 조건과 필수 조건을 구분한다.
4. 지원 가능 여부는 eligible, conditionally_eligible, not_eligible, insufficient_info 중 하나로만 분류한다.
5. 사용자 정보가 없으면 해당 조건을 충족했다고 가정하지 않는다.
6. 지원 불가 판정에는 명확한 불충족 조건을 disqualifyingReasons에 기록한다.
7. 추천 근거에는 공고문에서 확인한 evidence를 반영한다.
8. 마감일은 확실한 경우에만 YYYY-MM-DD로 변환한다.
9. 연도가 없거나 날짜가 모호하면 임의의 연도를 생성하지 않는다.
10. JSON Schema 이외의 형식이나 설명 문장을 출력하지 않는다.
11. mode는 gemini로 설정하고 tasks는 빈 배열로 반환해도 된다.
12. 모든 사용자-facing 문자열은 한국어로 작성한다.
13. 공고에 사용자의 regions에 없는 오프라인 장소나 필수 방문 일정이 있으면 참여 가능 여부를 missingInfo와 nextActions에 기록한다.`,
      temperature: 0.2,
      responseMimeType: "application/json",
      responseSchema: geminiAnalyzeResponseSchema,
    },
  };
}

async function generateGeminiAnalysis({ client, model, profile, rawText, url }) {
  return client.models.generateContent(createAnalyzeRequest({ model, profile, rawText, url }));
}

async function runGeminiAnalysisWithModel({ client, model, profile, rawText, url }) {
  const response = await generateGeminiAnalysis({ client, model, profile, rawText, url });
  const outputText = readGeminiText(response);

  if (!outputText) {
    throw new Error("Gemini API가 빈 응답을 반환했습니다.");
  }

  const parsed = providerAnalysisSchema.parse({
    ...parseJsonOutput(outputText),
    mode: "gemini",
  });
  const normalizedProviderResult = normalizeAnalysisResult(parsed);
  const normalized = normalizeAnalysisResult({
    ...normalizedProviderResult,
    mode: "gemini",
    tasks: createTasks(normalizedProviderResult.opportunity, normalizedProviderResult.match),
  });

  return analyzeResponseSchema.parse(normalized);
}

export function getFriendlyGeminiError(error) {
  const status = getErrorStatus(error);
  const message = getErrorMessageText(error);

  if (isQuotaOrRateLimitError(error)) {
    return "Gemini API 할당량 또는 요청 한도 때문에 현재 실제 AI 분석을 사용할 수 없습니다.";
  }

  if (isAuthOrPermissionError(error)) {
    return "Gemini API 키 또는 권한 설정이 올바르지 않아 현재 실제 AI 분석을 사용할 수 없습니다.";
  }

  if (isModelNotFoundError(error)) {
    return "Gemini 모델 이름을 확인할 수 없어 현재 실제 AI 분석을 사용할 수 없습니다.";
  }

  if (error instanceof SyntaxError || message.includes("json")) {
    return "Gemini 응답을 JSON으로 해석하지 못해 mock 결과를 표시합니다.";
  }

  if (error?.name === "ZodError" || message.includes("schema")) {
    return "Gemini 응답 형식 검증 중 문제가 발생해 mock 결과를 표시합니다.";
  }

  if (message.includes("빈 응답") || message.includes("empty response")) {
    return "Gemini가 빈 응답을 반환해 mock 결과를 표시합니다.";
  }

  if (message.includes("abort") || message.includes("timeout")) {
    return "Gemini 응답 시간이 길어져 mock 결과를 표시합니다.";
  }

  if (
    message.includes("fetch") ||
    message.includes("network") ||
    message.includes("econn") ||
    message.includes("enotfound")
  ) {
    return "네트워크 문제로 Gemini에 연결하지 못해 mock 결과를 표시합니다.";
  }

  if (status) {
    return "현재 Gemini 실제 분석을 사용할 수 없어 mock 결과를 표시합니다.";
  }

  return "현재 Gemini 실제 분석을 사용할 수 없어 mock 결과를 표시합니다.";
}

export async function geminiAnalyzeOpportunity({ profile, rawText, sourceUrl, url }) {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error("GEMINI_API_KEY가 없어 실제 Gemini 분석을 사용할 수 없습니다.");
  }

  const client = new GoogleGenAI({ apiKey });
  const configuredModel = process.env.GEMINI_MODEL || DEFAULT_GEMINI_MODEL;
  const resolvedSourceUrl = sourceUrl || url;

  try {
    return await runGeminiAnalysisWithModel({
      client,
      model: configuredModel,
      profile,
      rawText,
      url: resolvedSourceUrl,
    });
  } catch (error) {
    if (!shouldRetryWithFallback(error, configuredModel)) {
      throw error;
    }

    return runGeminiAnalysisWithModel({
      client,
      model: FALLBACK_GEMINI_MODEL,
      profile,
      rawText,
      url: resolvedSourceUrl,
    });
  }
}
