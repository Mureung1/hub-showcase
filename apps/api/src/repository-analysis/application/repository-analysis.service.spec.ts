import type { RepositoryAnalysisRequest } from "@ptop/contracts";
import type { GitHubRepositoryClient } from "../infrastructure/github/github-repository.client";
import type { GitHubRepositoryAnalysisSource } from "../domain/repository-analysis.models";
import type { RepositoryAnalysisPersistence } from "../infrastructure/persistence/repository-analysis.persistence";
import type { TechnicalChallengeAnalyzer } from "./technical-challenge/technical-challenge.analyzer";
import {
  InvalidRepositoryUrlError,
  RepositoryAnalysisService,
} from "./repository-analysis.service";

describe("RepositoryAnalysisService", () => {
  const source: GitHubRepositoryAnalysisSource = {
    repository: {
      githubRepositoryId: 123,
      url: "https://github.com/SubJeeLee/hub",
      owner: "SubJeeLee",
      name: "hub",
      description: "Project to Portfolio",
      defaultBranch: "main",
      visibility: "public",
      isFork: false,
      isArchived: false,
      topics: ["portfolio"],
      licenseSpdxId: "MIT",
      homepageUrl: null,
      githubCreatedAt: "2026-07-01T00:00:00Z",
      lastPushedAt: "2026-07-16T01:00:00Z",
      languages: { TypeScript: 80, CSS: 20 },
    },
    contributors: [
      { login: "SubJeeLee", commitCount: 3 },
      { login: "camper", commitCount: 1 },
    ],
    commits: [
      {
        sha: "abc123",
        authorLogin: "SubJeeLee",
        message: "feat: connect analysis API",
        committedAt: "2026-07-16T01:00:00Z",
        url: "https://github.com/SubJeeLee/hub/commit/abc123",
        changedFiles: ["src/app.ts"],
        additions: 20,
        deletions: 3,
      },
    ],
  };

  function createService() {
    const githubClient = {
      getRepositoryAnalysisSource: jest.fn().mockResolvedValue(source),
    };
    const persistence = {
      save: jest.fn().mockResolvedValue({ analysisResultId: "analysis-id", reused: false }),
    };
    const technicalChallengeAnalyzer = {
      analyze: jest.fn().mockResolvedValue({ candidates: [], warning: null }),
    };
    const service = new RepositoryAnalysisService(
      githubClient as unknown as GitHubRepositoryClient,
      persistence as unknown as RepositoryAnalysisPersistence,
      technicalChallengeAnalyzer as unknown as TechnicalChallengeAnalyzer,
    );

    return { service, githubClient, persistence, technicalChallengeAnalyzer };
  }

  it("collects, calculates, stores, and returns a Repository analysis", async () => {
    const { service, githubClient, persistence, technicalChallengeAnalyzer } = createService();
    const request: RepositoryAnalysisRequest = {
      repositoryUrl: "https://github.com/SubJeeLee/hub",
      githubLogin: "SubJeeLee",
    };

    const result = await service.analyze(request);

    expect(githubClient.getRepositoryAnalysisSource).toHaveBeenCalledWith("SubJeeLee", "hub");
    expect(technicalChallengeAnalyzer.analyze).toHaveBeenCalledTimes(1);
    expect(technicalChallengeAnalyzer.analyze).toHaveBeenCalledWith(
      expect.objectContaining({ targetGithubLogin: "SubJeeLee" }),
    );
    expect(persistence.save).toHaveBeenCalledWith(
      expect.objectContaining({
        targetGithubLogin: "SubJeeLee",
        analyzerVersion: "repository-v3",
        resultHash: expect.stringMatching(/^[a-f0-9]{64}$/),
        contributors: expect.arrayContaining([
          expect.objectContaining({ login: "SubJeeLee", commitCount: 3, commitActivityPercent: 75 }),
          expect.objectContaining({ login: "camper", commitCount: 1, commitActivityPercent: 25 }),
        ]),
        analysis: expect.objectContaining({
          qualitySignals: expect.objectContaining({ hasTests: false }),
          evidence: expect.arrayContaining([
            expect.objectContaining({ evidenceType: "commit", referenceId: "abc123" }),
          ]),
        }),
      }),
    );
    expect(result).toEqual({
      id: "analysis-id",
      repository: {
        url: "https://github.com/SubJeeLee/hub",
        owner: "SubJeeLee",
        name: "hub",
        description: "Project to Portfolio",
        defaultBranch: "main",
        languages: { TypeScript: 80, CSS: 20 },
      },
      contributors: [
        {
          login: "SubJeeLee",
          commitCount: 3,
          commitActivityPercent: 75,
          authoredPrCount: 0,
          mergedPrCount: 0,
          reviewCount: 0,
          issueCount: 0,
          touchedPaths: ["src/app.ts"],
          touchedExtensions: { ".ts": 1 },
          firstActivityAt: "2026-07-16T01:00:00Z",
          lastActivityAt: "2026-07-16T01:00:00Z",
        },
        {
          login: "camper",
          commitCount: 1,
          commitActivityPercent: 25,
          authoredPrCount: 0,
          mergedPrCount: 0,
          reviewCount: 0,
          issueCount: 0,
          touchedPaths: [],
          touchedExtensions: {},
          firstActivityAt: null,
          lastActivityAt: null,
        },
      ],
      commits: [
        {
          sha: "abc123",
          authorLogin: "SubJeeLee",
          message: "feat: connect analysis API",
          committedAt: "2026-07-16T01:00:00Z",
          changedFiles: ["src/app.ts"],
          additions: 20,
          deletions: 3,
        },
      ],
      contributionSummary: {
        metric: "commit_count",
        notice: "커밋 수 기반 활동 비율이며 실제 기여도나 작업 난이도를 의미하지 않습니다.",
      },
      analysis: expect.objectContaining({
        repositorySnapshot: expect.objectContaining({ readmeAvailable: false }),
        techStack: expect.objectContaining({ languages: { TypeScript: 80, CSS: 20 } }),
          collaborationSummary: expect.objectContaining({ pullRequestCount: 0, issueCount: 0 }),
          technicalChallenges: [],
        }),
      analyzedAt: expect.any(String),
    });
  });

  it("rejects an unsupported Repository URL before calling GitHub", async () => {
    const { service, githubClient } = createService();

    await expect(
      service.analyze({ repositoryUrl: "https://example.com/user/repo" }),
    ).rejects.toBeInstanceOf(InvalidRepositoryUrlError);
    expect(githubClient.getRepositoryAnalysisSource).not.toHaveBeenCalled();
  });

  it("does not ask AI to invent challenges when the selected GitHub ID has no activity", async () => {
    const { service, technicalChallengeAnalyzer, persistence } = createService();

    await service.analyze({
      repositoryUrl: "https://github.com/SubJeeLee/hub",
      githubLogin: "unknown-user",
    });

    expect(technicalChallengeAnalyzer.analyze).not.toHaveBeenCalled();
    expect(persistence.save).toHaveBeenCalledWith(
      expect.objectContaining({
        targetGithubLogin: "unknown-user",
        analysis: expect.objectContaining({
          technicalChallenges: [],
          warnings: ["입력한 GitHub ID의 활동을 Repository에서 찾지 못했습니다."],
        }),
      }),
    );
  });
});
