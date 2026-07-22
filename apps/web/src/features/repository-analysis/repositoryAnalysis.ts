import type { RepositoryAnalysisRequest } from "@ptop/contracts";

export const ANALYSIS_STATUS = {
  idle: "idle",
  loading: "loading",
  success: "success",
  error: "error",
} as const;

export type AnalysisStatus = (typeof ANALYSIS_STATUS)[keyof typeof ANALYSIS_STATUS];

export function isAnalysisReady(status: AnalysisStatus, hasResult: boolean): boolean {
  return status === ANALYSIS_STATUS.success && hasResult;
}

export type ParsedRepositoryUrl = {
  owner: string;
  repo: string;
};

export function parseGitHubRepositoryUrl(
  value: RepositoryAnalysisRequest["repositoryUrl"],
): ParsedRepositoryUrl | null {
  const trimmed = value.trim();
  const match = trimmed.match(/^https:\/\/github\.com\/([^/\s]+)\/([^/#?\s]+?)(?:\.git)?\/?$/);

  if (!match) {
    return null;
  }

  return {
    owner: match[1],
    repo: match[2],
  };
}

export function getRepositoryUrlError(value: RepositoryAnalysisRequest["repositoryUrl"]): string {
  const trimmed = value.trim();

  if (!trimmed) {
    return "분석할 GitHub Repository URL을 입력해 주세요.";
  }

  if (!trimmed.startsWith("https://github.com/")) {
    return "GitHub Repository URL만 분석할 수 있습니다.";
  }

  if (!parseGitHubRepositoryUrl(trimmed)) {
    return "https://github.com/owner/repository 형식으로 입력해 주세요.";
  }

  return "";
}
