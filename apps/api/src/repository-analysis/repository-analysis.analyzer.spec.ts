import type { GitHubRepositoryAnalysisSource } from "./repository-analysis.models";
import {
  createAnalysisDetails,
  createContributorMetrics,
} from "./repository-analysis.analyzer";

const source: GitHubRepositoryAnalysisSource = {
  repository: {
    githubRepositoryId: 1,
    url: "https://github.com/owner/repository",
    owner: "owner",
    name: "repository",
    description: "A test repository",
    defaultBranch: "main",
    visibility: "public",
    isFork: false,
    isArchived: false,
    topics: [],
    licenseSpdxId: null,
    homepageUrl: null,
    githubCreatedAt: "2026-07-01T00:00:00Z",
    lastPushedAt: "2026-07-20T00:00:00Z",
    languages: { TypeScript: 100 },
  },
  contributors: [{ login: "owner", commitCount: 2 }],
  commits: [
    {
      sha: "commit-1",
      authorLogin: "owner",
      message: "feat: add analysis",
      committedAt: "2026-07-10T00:00:00Z",
      url: "https://github.com/owner/repository/commit/commit-1",
      changedFiles: ["src/app.ts", "src/app.spec.ts"],
      additions: 20,
      deletions: 4,
    },
  ],
  readme: {
    path: "README.md",
    excerpt: "# Repository",
    characterCount: 13,
  },
  files: [
    { path: "README.md", type: "blob", size: 13 },
    { path: "package.json", type: "blob", size: 100 },
    { path: "src/app.ts", type: "blob", size: 300 },
    { path: "src/app.spec.ts", type: "blob", size: 200 },
    { path: ".github/workflows/ci.yml", type: "blob", size: 80 },
  ],
  packageManifest: {
    packageManager: "npm",
    frameworks: ["typescript"],
    dependencies: ["typescript"],
    scripts: ["lint", "test"],
  },
  pullRequests: [
    {
      number: 1,
      title: "분석 기능 추가",
      state: "closed",
      authorLogin: "owner",
      url: "https://github.com/owner/repository/pull/1",
      createdAt: "2026-07-11T00:00:00Z",
      mergedAt: "2026-07-12T00:00:00Z",
      changedFiles: 2,
      additions: 20,
      deletions: 4,
      reviewCount: 1,
      reviewerLogins: ["reviewer"],
    },
  ],
  issues: [
    {
      number: 2,
      title: "분석 결과가 필요함",
      state: "open",
      authorLogin: "owner",
      url: "https://github.com/owner/repository/issues/2",
      createdAt: "2026-07-09T00:00:00Z",
      closedAt: null,
      commentCount: 1,
    },
  ],
  treeTruncated: false,
  warnings: [],
};

describe("repository-analysis.analyzer", () => {
  it("enriches contributor metrics with PR, review, issue, and changed path signals", () => {
    expect(createContributorMetrics(source)).toEqual([
      {
        login: "owner",
        commitCount: 2,
        authoredPrCount: 1,
        mergedPrCount: 1,
        reviewCount: 0,
        issueCount: 1,
        touchedPaths: ["src/app.ts", "src/app.spec.ts"],
        touchedExtensions: { ".ts": 2 },
        firstActivityAt: "2026-07-09T00:00:00Z",
        lastActivityAt: "2026-07-12T00:00:00Z",
      },
      {
        login: "reviewer",
        commitCount: 0,
        authoredPrCount: 0,
        mergedPrCount: 0,
        reviewCount: 1,
        issueCount: 0,
        touchedPaths: [],
        touchedExtensions: {},
        firstActivityAt: "2026-07-11T00:00:00Z",
        lastActivityAt: "2026-07-11T00:00:00Z",
      },
    ]);
  });

  it("creates structured project signals and evidence without AI assumptions", () => {
    const details = createAnalysisDetails(source);

    expect(details.techStack).toEqual({
      languages: { TypeScript: 100 },
      packageManager: "npm",
      frameworks: ["typescript"],
      dependencies: ["typescript"],
      scripts: ["lint", "test"],
    });
    expect(details.projectStructure).toEqual({
      fileCount: 5,
      topLevelDirectories: ["src"],
      entryPoints: ["src/app.ts"],
      testPaths: ["src/app.spec.ts"],
      ciPaths: [".github/workflows/ci.yml"],
      deploymentPaths: [],
      treeTruncated: false,
    });
    expect(details.qualitySignals).toEqual({
      hasReadme: true,
      hasTests: true,
      hasTypeScript: true,
      hasCi: true,
      hasDeploymentConfig: false,
      hasLintScript: true,
      hasTestScript: true,
    });
    expect(details.collaborationSummary).toEqual({
      pullRequestCount: 1,
      mergedPullRequestCount: 1,
      openPullRequestCount: 0,
      issueCount: 1,
      openIssueCount: 1,
      reviewCount: 1,
    });
    expect(details.evidence.map((item) => item.evidenceType)).toEqual([
      "commit",
      "pull_request",
      "issue",
      "file",
      "config",
      "file",
      "file",
    ]);
  });
});
