import { ConfigService } from "@nestjs/config";
import {
  GitHubRateLimitError,
  GitHubRepositoryClient,
  GitHubRepositoryNotFoundError,
  GitHubRequestError,
} from "./github-repository.client";

describe("GitHubRepositoryClient", () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it("collects and normalizes public Repository analysis data", async () => {
    const responses = new Map<string, unknown>([
      [
        "https://api.github.com/repos/SubJeeLee/hub",
        {
          id: 123,
          html_url: "https://github.com/SubJeeLee/hub",
          owner: { login: "SubJeeLee" },
          name: "hub",
          description: "Project to Portfolio",
          default_branch: "main",
          visibility: "public",
          fork: false,
          archived: false,
          topics: ["portfolio", "analysis"],
          license: { spdx_id: "MIT" },
          homepage: "https://ptop.example.com",
          created_at: "2026-07-01T00:00:00Z",
          pushed_at: "2026-07-16T00:00:00Z",
        },
      ],
      ["https://api.github.com/repos/SubJeeLee/hub/languages", { TypeScript: 750, CSS: 250 }],
      [
        "https://api.github.com/repos/SubJeeLee/hub/contributors?per_page=100&anon=0",
        [
          { login: "SubJeeLee", contributions: 8 },
          { login: "camper", contributions: 2 },
        ],
      ],
      [
        "https://api.github.com/repos/SubJeeLee/hub/commits?per_page=100",
        [
          {
            sha: "abc123",
            author: { login: "SubJeeLee" },
            commit: {
              message: "feat: add repository analysis",
              author: { date: "2026-07-16T01:00:00Z" },
              committer: { date: "2026-07-16T01:00:00Z" },
            },
            html_url: "https://github.com/SubJeeLee/hub/commit/abc123",
          },
        ],
      ],
    ]);

    global.fetch = jest.fn(async (input) => {
      const body = responses.get(String(input));
      return new Response(JSON.stringify(body), {
        status: body === undefined ? 404 : 200,
        headers: { "content-type": "application/json" },
      });
    }) as typeof fetch;

    const client = new GitHubRepositoryClient(new ConfigService({ GITHUB_TOKEN: "test-token" }));
    const result = await client.getRepositoryAnalysisSource("SubJeeLee", "hub");

    expect(result.repository).toEqual({
      githubRepositoryId: 123,
      url: "https://github.com/SubJeeLee/hub",
      owner: "SubJeeLee",
      name: "hub",
      description: "Project to Portfolio",
      defaultBranch: "main",
      visibility: "public",
      isFork: false,
      isArchived: false,
      topics: ["portfolio", "analysis"],
      licenseSpdxId: "MIT",
      homepageUrl: "https://ptop.example.com",
      githubCreatedAt: "2026-07-01T00:00:00Z",
      lastPushedAt: "2026-07-16T00:00:00Z",
      languages: { TypeScript: 75, CSS: 25 },
    });
    expect(result.contributors).toEqual([
      { login: "SubJeeLee", commitCount: 8 },
      { login: "camper", commitCount: 2 },
    ]);
    expect(result.commits).toEqual([
      {
        sha: "abc123",
        authorLogin: "SubJeeLee",
        message: "feat: add repository analysis",
        committedAt: "2026-07-16T01:00:00Z",
        url: "https://github.com/SubJeeLee/hub/commit/abc123",
      },
    ]);
    expect(global.fetch).toHaveBeenCalledWith(
      "https://api.github.com/repos/SubJeeLee/hub",
      expect.objectContaining({
        headers: expect.objectContaining({
          Accept: "application/vnd.github+json",
          Authorization: "Bearer test-token",
          "User-Agent": "PtoP",
        }),
      }),
    );
  });

  it("maps a missing Repository to a domain error", async () => {
    global.fetch = jest.fn(async () => new Response("{}", { status: 404 })) as typeof fetch;
    const client = new GitHubRepositoryClient(new ConfigService());

    await expect(client.getRepositoryAnalysisSource("missing", "repo")).rejects.toBeInstanceOf(
      GitHubRepositoryNotFoundError,
    );
  });

  it("maps GitHub rate limits to a domain error", async () => {
    global.fetch = jest.fn(
      async () => new Response("{}", { status: 403, headers: { "x-ratelimit-remaining": "0" } }),
    ) as typeof fetch;
    const client = new GitHubRepositoryClient(new ConfigService());

    await expect(client.getRepositoryAnalysisSource("owner", "repo")).rejects.toBeInstanceOf(
      GitHubRateLimitError,
    );
  });

  it("maps unexpected GitHub failures without leaking response content", async () => {
    global.fetch = jest.fn(
      async () => new Response('{"token":"should-not-leak"}', { status: 500 }),
    ) as typeof fetch;
    const client = new GitHubRepositoryClient(new ConfigService());

    await expect(client.getRepositoryAnalysisSource("owner", "repo")).rejects.toEqual(
      new GitHubRequestError(500),
    );
  });
});
