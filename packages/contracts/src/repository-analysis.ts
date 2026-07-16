export type RepositoryAnalysisRequest = {
  repositoryUrl: string;
  githubLogin?: string;
};

export type RepositoryAnalysisErrorCode =
  | "INVALID_REPOSITORY_URL"
  | "REPOSITORY_NOT_FOUND"
  | "GITHUB_RATE_LIMITED"
  | "EXTERNAL_SERVICE_ERROR"
  | "INTERNAL_SERVER_ERROR";

export type RepositoryAnalysisErrorResponse = {
  code: RepositoryAnalysisErrorCode;
  message: string;
};

export type RepositoryMetadata = {
  url: string;
  owner: string;
  name: string;
  description: string | null;
  defaultBranch: string;
  languages: Record<string, number>;
};

export type RepositoryContributor = {
  login: string;
  commitCount: number;
  commitActivityPercent: number;
};

export type RepositoryCommit = {
  sha: string;
  authorLogin: string | null;
  message: string;
  committedAt: string;
};

export type ContributionSummary = {
  metric: "commit_count";
  notice: string;
};

export type RepositoryAnalysisResult = {
  id: string;
  repository: RepositoryMetadata;
  contributors: RepositoryContributor[];
  commits: RepositoryCommit[];
  contributionSummary: ContributionSummary;
  analyzedAt: string;
};
