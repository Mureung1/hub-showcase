import type {
  RepositoryAnalysisErrorCode,
  RepositoryAnalysisErrorResponse,
  RepositoryAnalysisRequest,
  RepositoryAnalysisResult,
} from "@ptop/contracts";

export class RepositoryAnalysisApiError extends Error {
  constructor(
    message: string,
    public readonly code: RepositoryAnalysisErrorCode,
    public readonly status: number,
  ) {
    super(message);
    this.name = "RepositoryAnalysisApiError";
  }
}

export function getRepositoryAnalysisErrorMessage(error: unknown): string {
  if (!(error instanceof RepositoryAnalysisApiError)) {
    return error instanceof Error
      ? error.message
      : "Repository 분석 요청에 실패했습니다. 잠시 후 다시 시도해 주세요.";
  }

  switch (error.code) {
    case "INVALID_REPOSITORY_URL":
      return "https://github.com/owner/repository 형식의 주소를 입력해 주세요.";
    case "REPOSITORY_NOT_FOUND":
      return "Repository를 찾을 수 없거나 접근 권한이 없습니다. 공개 Repository인지 확인해 주세요.";
    case "GITHUB_RATE_LIMITED":
      return "GitHub API 요청 한도를 초과했습니다. 잠시 후 다시 시도해 주세요.";
    case "EXTERNAL_SERVICE_ERROR":
      return "GitHub에서 분석 데이터를 가져오지 못했습니다. 잠시 후 다시 시도해 주세요.";
    case "ANALYSIS_PERSISTENCE_FAILED":
      return "분석 결과를 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.";
    case "AI_ANALYSIS_UNAVAILABLE":
      return "AI 분석을 사용할 수 없어 Repository 근거만 먼저 확인할 수 있습니다.";
    default:
      return "Repository 분석 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.";
  }
}

export async function requestRepositoryAnalysis(
  request: RepositoryAnalysisRequest,
  fetchImpl: typeof fetch = fetch,
  apiBaseUrl = getDefaultApiBaseUrl(),
): Promise<RepositoryAnalysisResult> {
  let response: Response;

  try {
    response = await fetchImpl(
      `${apiBaseUrl.replace(/\/$/, "")}/api/v1/repository-analyses`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(request),
      },
    );
  } catch {
    throw new Error("분석 서버에 연결할 수 없습니다. 잠시 후 다시 시도해 주세요.");
  }

  if (!response.ok) {
    const error = await readApiError(response);
    throw new RepositoryAnalysisApiError(error.message, error.code, response.status);
  }

  return (await response.json()) as RepositoryAnalysisResult;
}

async function readApiError(response: Response): Promise<RepositoryAnalysisErrorResponse> {
  try {
    const value = (await response.json()) as Partial<RepositoryAnalysisErrorResponse>;
    if (value.code && value.message) {
      return value as RepositoryAnalysisErrorResponse;
    }
  } catch {
    // A non-JSON upstream response is converted to a stable client message below.
  }

  return {
    code: "INTERNAL_SERVER_ERROR",
    message: "Repository 분석 요청에 실패했습니다.",
  };
}

function getDefaultApiBaseUrl(): string {
  const environment = (
    import.meta as ImportMeta & { env?: Record<string, string | undefined> }
  ).env;

  return environment?.VITE_API_BASE_URL || "http://localhost:3000";
}
