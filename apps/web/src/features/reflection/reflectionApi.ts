import type {
  ReflectionDraft,
  ReflectionDraftSaveResponse,
  RepositoryAnalysisErrorCode,
  RepositoryAnalysisErrorResponse,
  TechnicalChallengeCandidate,
} from "@ptop/contracts";

export type { ReflectionDraftSaveResponse } from "@ptop/contracts";

export class ReflectionSaveApiError extends Error {
  constructor(
    message: string,
    public readonly code: RepositoryAnalysisErrorCode,
    public readonly status: number,
  ) {
    super(message);
    this.name = "ReflectionSaveApiError";
  }
}

export async function saveReflectionDraftToApi(
  analysisResultId: string,
  draft: ReflectionDraft,
  fetchImpl: typeof fetch = fetch,
  apiBaseUrl = getDefaultApiBaseUrl(),
  technicalChallenges: TechnicalChallengeCandidate[] = [],
): Promise<ReflectionDraftSaveResponse> {
  let response: Response;

  try {
    response = await fetchImpl(
      `${apiBaseUrl.replace(/\/$/, "")}/api/v1/repository-analyses/${encodeURIComponent(analysisResultId)}/reflection`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ draft, technicalChallenges }),
      },
    );
  } catch {
    throw new Error("회고 저장 서버에 연결할 수 없습니다. 잠시 후 다시 시도해 주세요.");
  }

  if (!response.ok) {
    const error = await readApiError(response);
    throw new ReflectionSaveApiError(error.message, error.code, response.status);
  }

  return (await response.json()) as ReflectionDraftSaveResponse;
}

export async function loadReflectionDraftFromApi(
  analysisResultId: string,
  fetchImpl: typeof fetch = fetch,
  apiBaseUrl = getDefaultApiBaseUrl(),
): Promise<ReflectionDraftSaveResponse | null> {
  let response: Response;

  try {
    response = await fetchImpl(
      `${apiBaseUrl.replace(/\/$/, "")}/api/v1/repository-analyses/${encodeURIComponent(analysisResultId)}/reflection`,
      { method: "GET" },
    );
  } catch {
    throw new Error("회고 조회 서버에 연결할 수 없습니다. 잠시 후 다시 시도해 주세요.");
  }

  if (!response.ok) {
    const error = await readApiError(response, {
      code: "REFLECTION_LOAD_FAILED",
      message: "회고를 불러오지 못했습니다.",
    });
    throw new ReflectionSaveApiError(error.message, error.code, response.status);
  }

  const body = await response.text();
  if (!body.trim()) {
    return null;
  }

  const value = JSON.parse(body) as ReflectionDraftSaveResponse | null;
  return value;
}

async function readApiError(
  response: Response,
  fallback: RepositoryAnalysisErrorResponse = {
    code: "REFLECTION_SAVE_FAILED",
    message: "회고 저장에 실패했습니다.",
  },
): Promise<RepositoryAnalysisErrorResponse> {
  try {
    const value = (await response.json()) as Partial<RepositoryAnalysisErrorResponse>;
    if (value.code && value.message) {
      return value as RepositoryAnalysisErrorResponse;
    }
  } catch {
    // Convert a non-JSON upstream response into a stable client error below.
  }

  return fallback;
}

function getDefaultApiBaseUrl(): string {
  const environment = (
    import.meta as ImportMeta & { env?: Record<string, string | undefined> }
  ).env;

  return environment?.VITE_API_BASE_URL || "http://localhost:3000";
}
