export type RepositoryAnalysisRequest = {
  repositoryUrl: string;
  githubLogin?: string;
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
