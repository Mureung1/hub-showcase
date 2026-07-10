import type { ContextAnalysisResult } from "../types/context";

type ContextAnalysisErrorPayload = {
  error?: {
    code?: string;
    message?: string;
    details?: unknown;
  };
};

export class ContextAnalysisRequestError extends Error {
  status: number;
  code: string;
  details: unknown;

  constructor(message: string, status = 0, code = "NETWORK_ERROR", details: unknown = null) {
    super(message);
    this.name = "ContextAnalysisRequestError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export async function analyzeContext(
  projectTitle: string,
  inputText: string,
): Promise<ContextAnalysisResult> {
  let response: Response;

  try {
    response = await fetch("/api/context-analysis", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        projectTitle,
        rawText: inputText,
      }),
    });
  } catch {
    throw new ContextAnalysisRequestError(
      "분석 API에 연결할 수 없습니다. 개발 서버에서 /api/context-analysis가 실행 중인지 확인하세요.",
    );
  }

  const payload = (await parseJson(response)) as ContextAnalysisResult | ContextAnalysisErrorPayload;

  if (!response.ok) {
    const errorPayload = payload as ContextAnalysisErrorPayload;
    throw new ContextAnalysisRequestError(
      errorPayload.error?.message || "맥락 분석 요청에 실패했습니다.",
      response.status,
      errorPayload.error?.code || "ANALYSIS_REQUEST_FAILED",
      errorPayload.error?.details || null,
    );
  }

  if (!isContextAnalysisResult(payload)) {
    throw new ContextAnalysisRequestError(
      "분석 API 응답 형식이 올바르지 않습니다.",
      response.status,
      "INVALID_ANALYSIS_RESPONSE",
    );
  }

  return payload;
}

async function parseJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    throw new ContextAnalysisRequestError(
      "분석 API 응답을 JSON으로 읽을 수 없습니다.",
      response.status,
      "INVALID_JSON_RESPONSE",
    );
  }
}

function isContextAnalysisResult(value: unknown): value is ContextAnalysisResult {
  if (!value || typeof value !== "object") return false;

  const result = value as Partial<ContextAnalysisResult>;

  return (
    typeof result.projectTitle === "string" &&
    Boolean(result.summary) &&
    Array.isArray(result.summary?.overview) &&
    Array.isArray(result.keyTerms) &&
    Array.isArray(result.decisions) &&
    Array.isArray(result.participants) &&
    Array.isArray(result.questions) &&
    Boolean(result.knowledgeMap) &&
    Array.isArray(result.knowledgeMap?.nodes) &&
    Array.isArray(result.knowledgeMap?.links) &&
    Boolean(result.onboardingSummary) &&
    Array.isArray(result.onboardingSummary?.items) &&
    Boolean(result.participantAgents) &&
    Array.isArray(result.participantAgents?.views)
  );
}
