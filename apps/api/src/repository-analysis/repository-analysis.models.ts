export type GitHubRepositoryAnalysisSource = {
  repository: {
    githubRepositoryId: number;
    url: string;
    owner: string;
    name: string;
    description: string | null;
    defaultBranch: string;
    visibility: "public" | "private" | "internal";
    isFork: boolean;
    isArchived: boolean;
    topics: string[];
    licenseSpdxId: string | null;
    homepageUrl: string | null;
    githubCreatedAt: string;
    lastPushedAt: string | null;
    languages: Record<string, number>;
  };
  contributors: Array<{
    login: string;
    commitCount: number;
  }>;
  commits: Array<{
    sha: string;
    authorLogin: string | null;
    message: string;
    committedAt: string;
    url: string;
  }>;
};
