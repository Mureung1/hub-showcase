import type { RepositoryAnalysisRequest } from "@ptop/contracts";

export const ANALYSIS_STATUS = {
  idle: "idle",
  loading: "loading",
  success: "success",
  error: "error",
} as const;

export type AnalysisStatus = (typeof ANALYSIS_STATUS)[keyof typeof ANALYSIS_STATUS];

export type ParsedRepositoryUrl = {
  owner: string;
  repo: string;
};

export type ContributorSummary = {
  login: string;
  count: number;
  percent: number;
};

export type AnalysisResultData = {
  name: string;
  url: string;
  owner: string;
  repo: string;
  isMock: boolean;
  summary: string;
  contributors: ContributorSummary[];
  ownerMessages: string[];
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

export function createMockAnalysisResult({ owner, repo }: ParsedRepositoryUrl): AnalysisResultData {
  return {
    name: `${owner}/${repo}`,
    url: `https://github.com/${owner}/${repo}`,
    owner,
    repo,
    isMock: true,
    summary: `${repo} 저장소의 구조와 최근 작업 흐름을 분석한 예시 결과입니다.`,
    contributors: [
      { login: owner, count: 42, percent: 61.8 },
      { login: "team-member-a", count: 16, percent: 23.5 },
      { login: "team-member-b", count: 10, percent: 14.7 },
    ],
    ownerMessages: [
      "Repository 입력과 분석 시작 흐름 구성",
      "분석 결과 화면에 참여자와 주요 작업 단서 표시",
      "오류 상태와 다시 분석하기 흐름 정리",
    ],
  };
}
