import { describe, expect, it } from "@jest/globals";
import type { RepositoryAnalysisDetails } from "@ptop/contracts";
import type { GitHubRepositoryAnalysisSource } from "../../domain/repository-analysis.models";
import {
  TECHNICAL_CHALLENGE_CONTEXT_LIMITS,
  buildTechnicalChallengeContext,
} from "./technical-challenge.context";

const analysis: RepositoryAnalysisDetails = {
  repositorySnapshot: {
    readmeAvailable: true,
    readmePath: "README.md",
    readmeExcerpt: "Repository overview",
    readmeCharacterCount: 18,
  },
  techStack: {
    languages: { TypeScript: 100 },
    packageManager: "npm",
    frameworks: ["react"],
    dependencies: ["react"],
    scripts: ["test"],
  },
  projectStructure: {
    fileCount: 5,
    topLevelDirectories: ["apps"],
    entryPoints: ["apps/api/src/main.ts"],
    testPaths: ["apps/api/src/app.spec.ts"],
    ciPaths: [".github/workflows/ci.yml"],
    deploymentPaths: [],
    treeTruncated: false,
  },
  qualitySignals: {
    hasReadme: true,
    hasTests: true,
    hasTypeScript: true,
    hasCi: true,
    hasDeploymentConfig: false,
    hasLintScript: false,
    hasTestScript: true,
  },
  collaborationSummary: {
    pullRequestCount: 0,
    mergedPullRequestCount: 0,
    openPullRequestCount: 0,
    issueCount: 0,
    openIssueCount: 0,
    reviewCount: 0,
  },
  technicalChallenges: [],
  warnings: [],
  evidence: [],
};

function createSource(): GitHubRepositoryAnalysisSource {
  return {
    repository: {
      githubRepositoryId: 1,
      url: "https://github.com/owner/repository",
      owner: "owner",
      name: "repository",
      description: "Repository description",
      defaultBranch: "main",
      visibility: "public",
      isFork: false,
      isArchived: false,
      topics: [],
      licenseSpdxId: null,
      homepageUrl: null,
      githubCreatedAt: "2026-01-01T00:00:00.000Z",
      lastPushedAt: "2026-07-20T00:00:00.000Z",
      languages: { TypeScript: 100 },
    },
    contributors: [],
    commits: [],
    files: [
      {
        path: "README.md",
        type: "blob",
        size: 12,
        content: "# overview",
        contentAvailable: true,
      },
      {
        path: "apps/api/src/main.ts",
        type: "blob",
        size: 25,
        content: "export function main() {}",
        contentAvailable: true,
      },
      {
        path: "apps/api/src/app.spec.ts",
        type: "blob",
        size: 24,
        content: "describe(\"app\", () => {});",
        contentAvailable: true,
      },
    ],
    warnings: [],
  };
}

describe("buildTechnicalChallengeContext", () => {
  it("prioritizes documentation and entrypoint files before test files", () => {
    const context = buildTechnicalChallengeContext(createSource(), analysis);

    expect(context.files.map((file) => file.path)).toEqual([
      "README.md",
      "apps/api/src/main.ts",
      "apps/api/src/app.spec.ts",
    ]);
    expect(context.files[0]?.priority).toBe("critical");
    expect(context.files[1]?.priority).toBe("high");
    expect(context.files[2]?.priority).toBe("normal");
  });

  it("truncates file and total content within the token budget", () => {
    const source = createSource();
    source.files = Array.from({ length: 25 }, (_, index) => ({
      path: `src/feature-${index}.ts`,
      type: "blob" as const,
      size: 10_000,
      content: "x".repeat(10_000),
      contentAvailable: true,
    }));

    const context = buildTechnicalChallengeContext(source, analysis);
    const totalCharacters = context.files.reduce((total, file) => total + file.content.length, 0);

    expect(context.files.length).toBeLessThanOrEqual(TECHNICAL_CHALLENGE_CONTEXT_LIMITS.maxFiles);
    expect(context.files.every((file) => file.content.length <= 6_000)).toBe(true);
    expect(totalCharacters).toBeLessThanOrEqual(40_000);
    expect(context.truncated).toBe(true);
    expect(context.estimatedTokens).toBe(Math.ceil(totalCharacters / 4));
  });

  it("limits files and evidence to the selected GitHub contributor", () => {
    const source = createSource();
    source.commits = [
      {
        sha: "mine",
        authorLogin: "SubJeeLee",
        message: "implement reflection flow",
        committedAt: "2026-07-20T00:00:00.000Z",
        url: "https://github.com/owner/repository/commit/mine",
        changedFiles: ["src/reflection.ts"],
      },
      {
        sha: "other",
        authorLogin: "camper",
        message: "update landing page",
        committedAt: "2026-07-19T00:00:00.000Z",
        url: "https://github.com/owner/repository/commit/other",
        changedFiles: ["src/landing.tsx"],
      },
    ];
    source.files = [
      {
        path: "src/reflection.ts",
        type: "blob",
        size: 20,
        content: "export function reflect() {}",
        contentAvailable: true,
      },
      {
        path: "src/landing.tsx",
        type: "blob",
        size: 20,
        content: "export function landing() {}",
        contentAvailable: true,
      },
    ];
    analysis.evidence = [
      {
        evidenceType: "commit",
        referenceId: "mine",
        title: "implement reflection flow",
        url: "https://github.com/owner/repository/commit/mine",
        filePath: null,
        occurredAt: "2026-07-20T00:00:00.000Z",
        contributorLogin: "SubJeeLee",
        metadata: {},
      },
      {
        evidenceType: "commit",
        referenceId: "other",
        title: "update landing page",
        url: "https://github.com/owner/repository/commit/other",
        filePath: null,
        occurredAt: "2026-07-19T00:00:00.000Z",
        contributorLogin: "camper",
        metadata: {},
      },
    ];

    const context = buildTechnicalChallengeContext(source, analysis, "subjeelee");

    expect(context.targetGithubLogin).toBe("subjeelee");
    expect(context.files.map((file) => file.path)).toEqual(["src/reflection.ts"]);
    expect(context.targetActivity.commits.map((commit) => commit.sha)).toEqual(["mine"]);
    expect(context.evidence.map((evidence) => evidence.referenceId)).toEqual(["mine"]);
    expect(context.analysis.evidence.map((evidence) => evidence.referenceId)).toEqual(["mine"]);
  });
});
