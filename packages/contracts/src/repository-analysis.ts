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
  | "AI_ANALYSIS_UNAVAILABLE"
  | "ANALYSIS_PERSISTENCE_FAILED"
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
  | "discussion"
  | "project"
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
  /** PR 본문에 직접 첨부된 이미지 URL. 다른 출처의 이미지는 포함하지 않습니다. */
  imageUrls?: string[];
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

/** 기술적 도전 후보와 연결된 실제 Repository 파일의 제한된 원문입니다. */
export type RepositoryCodeReference = {
  filePath: string;
  url: string;
  language: string;
  content: string;
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
  /** 후보 분석에 사용된 파일 중 초안 생성을 위해 재사용할 수 있는 코드 근거입니다. */
  codeReferences?: RepositoryCodeReference[];
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
