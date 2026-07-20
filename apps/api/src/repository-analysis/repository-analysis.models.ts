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
    changedFiles?: string[];
    additions?: number;
    deletions?: number;
  }>;
  readme?: {
    path: string;
    excerpt: string;
    characterCount: number;
  } | null;
  files?: Array<{
    path: string;
    type: "blob" | "tree";
    size: number | null;
  }>;
  packageManifest?: {
    packageManager: string | null;
    frameworks: string[];
    dependencies: string[];
    scripts: string[];
  } | null;
  pullRequests?: Array<{
    number: number;
    title: string;
    state: "open" | "closed";
    authorLogin: string | null;
    url: string;
    createdAt: string;
    mergedAt: string | null;
    changedFiles: number | null;
    additions: number | null;
    deletions: number | null;
    reviewCount: number;
    reviewerLogins: string[];
  }>;
  issues?: Array<{
    number: number;
    title: string;
    state: "open" | "closed";
    authorLogin: string | null;
    url: string;
    createdAt: string;
    closedAt: string | null;
    commentCount: number;
  }>;
  treeTruncated?: boolean;
  warnings?: string[];
};

export type RepositoryAnalysisPersistenceInput = {
  targetGithubLogin: string | null;
  analyzedAt: string;
  resultHash: string;
  analyzerVersion: string;
  source: GitHubRepositoryAnalysisSource;
  contributors: Array<{
    login: string;
    commitCount: number;
    commitActivityPercent: number;
    authoredPrCount?: number;
    mergedPrCount?: number;
    reviewCount?: number;
    issueCount?: number;
    touchedPaths?: string[];
    touchedExtensions?: Record<string, number>;
    firstActivityAt?: string | null;
    lastActivityAt?: string | null;
  }>;
  analysis?: {
    repositorySnapshot: Record<string, unknown>;
    techStack: Record<string, unknown>;
    projectStructure: Record<string, unknown>;
    qualitySignals: Record<string, unknown>;
    collaborationSummary: Record<string, unknown>;
    warnings: string[];
    evidence: Array<{
      evidenceType: "commit" | "pull_request" | "issue" | "file" | "config" | "release";
      referenceId: string | null;
      title: string;
      url: string | null;
      filePath: string | null;
      occurredAt: string | null;
      contributorLogin: string | null;
      metadata: Record<string, string | number | boolean | null>;
    }>;
  };
};
