import type {
  AnalysisMode,
  AnalysisRunResource,
  CapabilitiesResource,
  CreateProjectInput,
  CreateSourceInput,
  ProjectResource,
  ShareLinkResource,
  SharedAnalysisResource,
  SourceRecordResource,
  UpdateProjectInput,
  UpdateSourceInput,
} from "../types/platform";

type ErrorPayload = {
  error?: {
    code?: string;
    message?: string;
    details?: unknown;
  };
};

export class PlatformApiError extends Error {
  status: number;
  code: string;
  details: unknown;

  constructor(message: string, status: number, code: string, details: unknown = null) {
    super(message);
    this.name = "PlatformApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export interface PlatformApi {
  getCapabilities(token: string): Promise<CapabilitiesResource>;
  listProjects(token: string): Promise<ProjectResource[]>;
  createProject(token: string, input: CreateProjectInput): Promise<ProjectResource>;
  getProject(token: string, projectId: string): Promise<ProjectResource>;
  updateProject(
    token: string,
    projectId: string,
    input: UpdateProjectInput,
  ): Promise<ProjectResource>;
  deleteProject(token: string, projectId: string, permanent?: boolean): Promise<void>;
  listSources(token: string, projectId: string): Promise<SourceRecordResource[]>;
  createSource(
    token: string,
    projectId: string,
    input: CreateSourceInput,
  ): Promise<SourceRecordResource>;
  updateSource(
    token: string,
    sourceId: string,
    input: UpdateSourceInput,
  ): Promise<SourceRecordResource>;
  deleteSource(token: string, sourceId: string): Promise<void>;
  listAnalysisRuns(token: string, projectId: string): Promise<AnalysisRunResource[]>;
  createAnalysisRun(
    token: string,
    projectId: string,
    input: { sourceIds: string[]; mode: AnalysisMode },
    idempotencyKey: string,
    signal?: AbortSignal,
  ): Promise<AnalysisRunResource>;
  getAnalysisRun(token: string, runId: string): Promise<AnalysisRunResource>;
  deleteAnalysisRun(token: string, runId: string): Promise<void>;
  listShareLinks(token: string, runId: string): Promise<ShareLinkResource[]>;
  createShareLink(
    token: string,
    runId: string,
    expiresInDays: number,
  ): Promise<ShareLinkResource>;
  revokeShareLink(token: string, shareLinkId: string): Promise<void>;
  resolveSharedAnalysis(token: string): Promise<SharedAnalysisResource>;
}

class HttpPlatformApi implements PlatformApi {
  getCapabilities(token: string) {
    return this.request<CapabilitiesResource>("/api/v1/capabilities", { token });
  }

  listProjects(token: string) {
    return this.request<ProjectResource[]>("/api/v1/projects", { token });
  }

  createProject(token: string, input: CreateProjectInput) {
    return this.request<ProjectResource>("/api/v1/projects", {
      token,
      method: "POST",
      body: input,
    });
  }

  getProject(token: string, projectId: string) {
    return this.request<ProjectResource>(`/api/v1/projects/${encodeURIComponent(projectId)}`, {
      token,
    });
  }

  updateProject(token: string, projectId: string, input: UpdateProjectInput) {
    return this.request<ProjectResource>(`/api/v1/projects/${encodeURIComponent(projectId)}`, {
      token,
      method: "PATCH",
      body: input,
    });
  }

  async deleteProject(token: string, projectId: string, permanent = false) {
    await this.request<unknown>(
      `/api/v1/projects/${encodeURIComponent(projectId)}${permanent ? "?permanent=true" : ""}`,
      {
        token,
        method: "DELETE",
        headers: permanent ? { "X-Confirm-Permanent-Delete": "delete" } : undefined,
      },
    );
  }

  listSources(token: string, projectId: string) {
    return this.request<SourceRecordResource[]>(
      `/api/v1/projects/${encodeURIComponent(projectId)}/sources`,
      { token },
    );
  }

  createSource(token: string, projectId: string, input: CreateSourceInput) {
    return this.request<SourceRecordResource>(
      `/api/v1/projects/${encodeURIComponent(projectId)}/sources`,
      { token, method: "POST", body: input },
    );
  }

  updateSource(token: string, sourceId: string, input: UpdateSourceInput) {
    return this.request<SourceRecordResource>(`/api/v1/sources/${encodeURIComponent(sourceId)}`, {
      token,
      method: "PATCH",
      body: input,
    });
  }

  async deleteSource(token: string, sourceId: string) {
    await this.request<unknown>(`/api/v1/sources/${encodeURIComponent(sourceId)}`, {
      token,
      method: "DELETE",
    });
  }

  listAnalysisRuns(token: string, projectId: string) {
    return this.request<AnalysisRunResource[]>(
      `/api/v1/projects/${encodeURIComponent(projectId)}/analysis-runs`,
      { token },
    );
  }

  createAnalysisRun(
    token: string,
    projectId: string,
    input: { sourceIds: string[]; mode: AnalysisMode },
    idempotencyKey: string,
    signal?: AbortSignal,
  ) {
    return this.request<AnalysisRunResource>(
      `/api/v1/projects/${encodeURIComponent(projectId)}/analysis-runs`,
      {
        token,
        method: "POST",
        body: input,
        signal,
        headers: { "Idempotency-Key": idempotencyKey },
      },
    );
  }

  getAnalysisRun(token: string, runId: string) {
    return this.request<AnalysisRunResource>(`/api/v1/analysis-runs/${encodeURIComponent(runId)}`, {
      token,
    });
  }

  async deleteAnalysisRun(token: string, runId: string) {
    await this.request<unknown>(`/api/v1/analysis-runs/${encodeURIComponent(runId)}`, {
      token,
      method: "DELETE",
    });
  }

  listShareLinks(token: string, runId: string) {
    return this.request<ShareLinkResource[]>(
      `/api/v1/analysis-runs/${encodeURIComponent(runId)}/share-links`,
      { token },
    );
  }

  createShareLink(token: string, runId: string, expiresInDays: number) {
    return this.request<ShareLinkResource>(
      `/api/v1/analysis-runs/${encodeURIComponent(runId)}/share-links`,
      { token, method: "POST", body: { expiresInDays } },
    );
  }

  async revokeShareLink(token: string, shareLinkId: string) {
    await this.request<unknown>(`/api/v1/share-links/${encodeURIComponent(shareLinkId)}`, {
      token,
      method: "DELETE",
    });
  }

  resolveSharedAnalysis(token: string) {
    return this.request<SharedAnalysisResource>("/api/v1/shared/resolve", {
      method: "POST",
      body: { token },
    });
  }

  private async request<T>(
    path: string,
    options: {
      token?: string;
      method?: string;
      body?: unknown;
      signal?: AbortSignal;
      headers?: Record<string, string>;
    },
  ): Promise<T> {
    let response: Response;
    try {
      response = await fetch(path, {
        method: options.method ?? "GET",
        signal: options.signal,
        headers: {
          Accept: "application/json",
          ...(options.body === undefined ? {} : { "Content-Type": "application/json" }),
          ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
          ...options.headers,
        },
        body: options.body === undefined ? undefined : JSON.stringify(options.body),
      });
    } catch (error) {
      if (options.signal?.aborted) throw error;
      throw new PlatformApiError(
        "서버에 연결할 수 없습니다. 네트워크 상태를 확인해 주세요.",
        0,
        "NETWORK_ERROR",
      );
    }

    if (response.status === 204) return undefined as T;
    const payload = (await response.json().catch(() => null)) as
      | { data?: T }
      | ErrorPayload
      | null;
    if (!response.ok) {
      const error = (payload as ErrorPayload | null)?.error;
      throw new PlatformApiError(
        error?.message ?? "요청을 처리하지 못했습니다.",
        response.status,
        error?.code ?? "REQUEST_FAILED",
        error?.details,
      );
    }
    if (!payload || !("data" in payload)) {
      throw new PlatformApiError(
        "서버 응답 형식이 올바르지 않습니다.",
        response.status,
        "INVALID_RESPONSE",
      );
    }
    return payload.data as T;
  }
}

export const platformApi: PlatformApi = new HttpPlatformApi();
