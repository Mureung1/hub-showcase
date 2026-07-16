import type { RepositoryAnalysisRequest } from "@ptop/contracts";
import type { GitHubRepositoryClient } from "./github-repository.client";
import type { GitHubRepositoryAnalysisSource } from "./repository-analysis.models";
import type { RepositoryAnalysisPersistence } from "./repository-analysis.persistence";
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
    const service = new RepositoryAnalysisService(
      githubClient as unknown as GitHubRepositoryClient,
      persistence as unknown as RepositoryAnalysisPersistence,
    );

    return { service, githubClient, persistence };
  }

  it("collects, calculates, stores, and returns a Repository analysis", async () => {
    const { service, githubClient, persistence } = createService();
    const request: RepositoryAnalysisRequest = {
      repositoryUrl: "https://github.com/SubJeeLee/hub",
      githubLogin: "SubJeeLee",
    };

    const result = await service.analyze(request);

    expect(githubClient.getRepositoryAnalysisSource).toHaveBeenCalledWith("SubJeeLee", "hub");
    expect(persistence.save).toHaveBeenCalledWith(
      expect.objectContaining({
        targetGithubLogin: "SubJeeLee",
        analyzerVersion: "repository-v1",
        resultHash: expect.stringMatching(/^[a-f0-9]{64}$/),
        contributors: [
          { login: "SubJeeLee", commitCount: 3, commitActivityPercent: 75 },
          { login: "camper", commitCount: 1, commitActivityPercent: 25 },
        ],
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
        { login: "SubJeeLee", commitCount: 3, commitActivityPercent: 75 },
        { login: "camper", commitCount: 1, commitActivityPercent: 25 },
      ],
      commits: [
        {
          sha: "abc123",
          authorLogin: "SubJeeLee",
          message: "feat: connect analysis API",
          committedAt: "2026-07-16T01:00:00Z",
        },
      ],
      contributionSummary: {
        metric: "commit_count",
        notice: "커밋 수 기반 활동 비율이며 실제 기여도나 작업 난이도를 의미하지 않습니다.",
      },
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
});
