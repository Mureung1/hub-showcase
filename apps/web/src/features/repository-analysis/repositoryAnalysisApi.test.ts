import assert from "node:assert/strict";
import test from "node:test";
import type { RepositoryAnalysisResult } from "@ptop/contracts";
import {
  RepositoryAnalysisApiError,
  requestRepositoryAnalysis,
} from "./repositoryAnalysisApi";

const result: RepositoryAnalysisResult = {
  id: "analysis-id",
  repository: {
    url: "https://github.com/SubJeeLee/hub",
    owner: "SubJeeLee",
    name: "hub",
    description: "Project to Portfolio",
    defaultBranch: "main",
    languages: { TypeScript: 100 },
  },
  contributors: [],
  commits: [],
  contributionSummary: {
    metric: "commit_count",
    notice: "커밋 수 기반 활동 비율입니다.",
  },
  analysis: {
    repositorySnapshot: {
      readmeAvailable: false,
      readmePath: null,
      readmeExcerpt: null,
      readmeCharacterCount: 0,
    },
    techStack: {
      languages: { TypeScript: 100 },
      packageManager: null,
      frameworks: [],
      dependencies: [],
      scripts: [],
    },
    projectStructure: {
      fileCount: 0,
      topLevelDirectories: [],
      entryPoints: [],
      testPaths: [],
      ciPaths: [],
      deploymentPaths: [],
      treeTruncated: false,
    },
    qualitySignals: {
      hasReadme: false,
      hasTests: false,
      hasTypeScript: true,
      hasCi: false,
      hasDeploymentConfig: false,
      hasLintScript: false,
      hasTestScript: false,
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
  },
  analyzedAt: "2026-07-16T02:00:00.000Z",
};

test("requestRepositoryAnalysis posts the Repository URL and returns the result", async () => {
  const fetchCalls: Array<{ input: string; init?: RequestInit }> = [];
  const fetchImpl: typeof fetch = async (input, init) => {
    fetchCalls.push({ input: String(input), init });
    return new Response(JSON.stringify(result), {
      status: 201,
      headers: { "content-type": "application/json" },
    });
  };

  const response = await requestRepositoryAnalysis(
    { repositoryUrl: "https://github.com/SubJeeLee/hub", githubLogin: "SubJeeLee" },
    fetchImpl,
    "http://localhost:3000",
  );

  assert.deepEqual(response, result);
  assert.equal(fetchCalls[0].input, "http://localhost:3000/api/v1/repository-analyses");
  assert.deepEqual(fetchCalls[0].init, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        repositoryUrl: "https://github.com/SubJeeLee/hub",
        githubLogin: "SubJeeLee",
      }),
  });
});

test("requestRepositoryAnalysis exposes a stable JSON API error", async () => {
  const fetchImpl: typeof fetch = async () =>
    new Response(
      JSON.stringify({
        code: "REPOSITORY_NOT_FOUND",
        message: "GitHub Repository를 찾을 수 없습니다.",
      }),
      { status: 404, headers: { "content-type": "application/json" } },
    );

  await assert.rejects(
    requestRepositoryAnalysis({ repositoryUrl: "https://github.com/user/missing" }, fetchImpl),
    (error: unknown) => {
      assert.ok(error instanceof RepositoryAnalysisApiError);
      assert.equal(error.code, "REPOSITORY_NOT_FOUND");
      assert.equal(error.status, 404);
      assert.equal(error.message, "GitHub Repository를 찾을 수 없습니다.");
      return true;
    },
  );
});

test("requestRepositoryAnalysis provides a useful network failure", async () => {
  const fetchImpl: typeof fetch = async () => {
    throw new TypeError("fetch failed");
  };

  await assert.rejects(
    requestRepositoryAnalysis({ repositoryUrl: "https://github.com/user/repo" }, fetchImpl),
    /분석 서버에 연결할 수 없습니다/,
  );
});
