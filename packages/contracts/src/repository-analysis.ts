export type RepositoryAnalysisRequest = {
  repositoryUrl: string;
  githubLogin?: string;
};

export type RepositoryAnalysisErrorCode =
  | "INVALID_REPOSITORY_URL"
  | "INVALID_REFLECTION_DRAFT"
  | "REPOSITORY_NOT_FOUND"
  | "GITHUB_RATE_LIMITED"
  | "EXTERNAL_SERVICE_ERROR"
  | "REFLECTION_LOAD_FAILED"
  | "REFLECTION_SAVE_FAILED"
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
  changedFiles?: string[];
  additions?: number;
  deletions?: number;
};

export type RepositoryAnalysisEvidenceType =
  | "commit"
  | "pull_request"
  | "issue"
  | "file"
  | "config"
  | "release";

export type RepositoryAnalysisEvidence = {
  evidenceType: RepositoryAnalysisEvidenceType;
  referenceId: string | null;
  title: string;
  url: string | null;
  filePath: string | null;
  occurredAt: string | null;
  contributorLogin: string | null;
  metadata: Record<string, string | number | boolean | null>;
};

export type TechnicalChallengeConfidence = "high" | "medium" | "low";

export type TechnicalChallengeEvidenceReference = {
  evidenceType: RepositoryAnalysisEvidenceType;
  referenceId: string | null;
  title: string;
  url: string | null;
  filePath: string | null;
};

export type TechnicalChallengeCandidate = {
  title: string;
  summary: string;
  background: string | null;
  problem: string | null;
  solution: string | null;
  technicalChallenge: string;
  whyItMatters: string;
  confidence: TechnicalChallengeConfidence;
  requiresUserConfirmation: boolean;
  evidence: TechnicalChallengeEvidenceReference[];
};

export type RepositoryAnalysisDetails = {
  repositorySnapshot: {
    readmeAvailable: boolean;
    readmePath: string | null;
    readmeExcerpt: string | null;
    readmeCharacterCount: number;
  };
  techStack: {
    languages: Record<string, number>;
    packageManager: string | null;
    frameworks: string[];
    dependencies: string[];
    scripts: string[];
  };
  projectStructure: {
    fileCount: number;
    topLevelDirectories: string[];
    entryPoints: string[];
    testPaths: string[];
    ciPaths: string[];
    deploymentPaths: string[];
    treeTruncated: boolean;
  };
  qualitySignals: {
    hasReadme: boolean;
    hasTests: boolean;
    hasTypeScript: boolean;
    hasCi: boolean;
    hasDeploymentConfig: boolean;
    hasLintScript: boolean;
    hasTestScript: boolean;
  };
  collaborationSummary: {
    pullRequestCount: number;
    mergedPullRequestCount: number;
    openPullRequestCount: number;
    issueCount: number;
    openIssueCount: number;
    reviewCount: number;
  };
  technicalChallenges: TechnicalChallengeCandidate[];
  warnings: string[];
  evidence: RepositoryAnalysisEvidence[];
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
  analysis: RepositoryAnalysisDetails;
  analyzedAt: string;
};
