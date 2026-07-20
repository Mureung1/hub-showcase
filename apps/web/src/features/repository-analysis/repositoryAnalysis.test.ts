import assert from "node:assert/strict";
import test from "node:test";
import type { RepositoryAnalysisResult } from "@ptop/contracts";
import {
  ANALYSIS_STATUS,
  getRepositoryUrlError,
  parseGitHubRepositoryUrl,
} from "./repositoryAnalysis";
import { getAnalysisResultViewModel } from "./AnalysisResult";

test("parseGitHubRepositoryUrl parses a normal GitHub repository URL", () => {
  assert.deepEqual(parseGitHubRepositoryUrl("https://github.com/SubJeeLee/hub"), {
    owner: "SubJeeLee",
    repo: "hub",
  });
});

test("parseGitHubRepositoryUrl supports trailing slash and .git suffix", () => {
  assert.deepEqual(parseGitHubRepositoryUrl("https://github.com/SubJeeLee/hub.git/"), {
    owner: "SubJeeLee",
    repo: "hub",
  });
});

test("getRepositoryUrlError blocks empty and invalid repository URLs", () => {
  assert.equal(getRepositoryUrlError(""), "분석할 GitHub Repository URL을 입력해 주세요.");
  assert.equal(
    getRepositoryUrlError("https://example.com/SubJeeLee/hub"),
    "GitHub Repository URL만 분석할 수 있습니다.",
  );
  assert.equal(
    getRepositoryUrlError("https://github.com/SubJeeLee"),
    "https://github.com/owner/repository 형식으로 입력해 주세요.",
  );
});

test("ANALYSIS_STATUS keeps the UI state model explicit", () => {
  assert.deepEqual(ANALYSIS_STATUS, {
    idle: "idle",
    loading: "loading",
    success: "success",
    error: "error",
  });
});

test("analysis result view model exposes Issue #13 analysis fields without landing copy", () => {
  const result: RepositoryAnalysisResult = {
    id: "analysis-1",
    repository: {
      url: "https://github.com/owner/repository",
      owner: "owner",
      name: "repository",
      description: "Repository description",
      defaultBranch: "main",
      languages: { TypeScript: 80, CSS: 20 },
    },
    contributors: [
      { login: "owner", commitCount: 8, commitActivityPercent: 100 },
    ],
    commits: [
      {
        sha: "commit-1",
        authorLogin: "owner",
        message: "add repository analysis",
        committedAt: "2026-07-20T00:00:00Z",
        changedFiles: ["apps/api/src/app.ts"],
        additions: 10,
        deletions: 2,
      },
    ],
    contributionSummary: {
      metric: "commit_count",
      notice: "커밋 수 기반 활동 비율입니다.",
    },
    analysis: {
      repositorySnapshot: {
        readmeAvailable: true,
        readmePath: "README.md",
        readmeExcerpt: "Repository overview",
        readmeCharacterCount: 20,
      },
      techStack: {
        languages: { TypeScript: 80, CSS: 20 },
        packageManager: "npm",
        frameworks: ["react", "@nestjs/core"],
        dependencies: ["react", "@nestjs/core"],
        scripts: ["test", "build"],
      },
      projectStructure: {
        fileCount: 42,
        topLevelDirectories: ["apps", "packages"],
        entryPoints: ["apps/api/src/main.ts"],
        testPaths: ["apps/api/src/app.spec.ts"],
        ciPaths: [".github/workflows/ci.yml"],
        deploymentPaths: ["vercel.json"],
        treeTruncated: false,
      },
      qualitySignals: {
        hasReadme: true,
        hasTests: true,
        hasTypeScript: true,
        hasCi: true,
        hasDeploymentConfig: true,
        hasLintScript: false,
        hasTestScript: true,
      },
      collaborationSummary: {
        pullRequestCount: 4,
        mergedPullRequestCount: 3,
        openPullRequestCount: 1,
        issueCount: 6,
        openIssueCount: 2,
        reviewCount: 5,
      },
      warnings: ["최근 커밋 상세 일부를 확인하지 못했습니다."],
      evidence: [
        {
          evidenceType: "file",
          referenceId: null,
          title: "README.md",
          url: "https://github.com/owner/repository/blob/main/README.md",
          filePath: "README.md",
          occurredAt: null,
          contributorLogin: null,
          metadata: {},
        },
      ],
    },
    analyzedAt: "2026-07-20T00:00:00Z",
  };

  const viewModel = getAnalysisResultViewModel(result);

  assert.equal(viewModel.fileCount, 42);
  assert.deepEqual(viewModel.frameworks, ["react", "@nestjs/core"]);
  assert.equal(viewModel.pullRequestCount, 4);
  assert.equal(viewModel.evidence[0]?.title, "README.md");
  assert.equal("problem" in viewModel, false);
  assert.equal("solution" in viewModel, false);
});
