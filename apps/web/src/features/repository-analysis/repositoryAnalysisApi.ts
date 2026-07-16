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
