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
      [
        "https://api.github.com/repos/SubJeeLee/hub/commits/abc123",
        {
          sha: "abc123",
          author: { login: "SubJeeLee" },
          commit: {
            message: "feat: add repository analysis",
            author: { date: "2026-07-16T01:00:00Z" },
            committer: { date: "2026-07-16T01:00:00Z" },
          },
          html_url: "https://github.com/SubJeeLee/hub/commit/abc123",
          stats: { additions: 20, deletions: 3 },
          files: [{ filename: "src/app.ts" }],
        },
      ],
      [
        "https://api.github.com/repos/SubJeeLee/hub/readme",
        {
          type: "file",
          path: "README.md",
          encoding: "base64",
          content: Buffer.from("# PtoP\nRepository analysis").toString("base64"),
        },
      ],
      [
        "https://api.github.com/repos/SubJeeLee/hub/git/trees/main?recursive=1",
        {
          truncated: false,
          tree: [
            { path: "README.md", type: "blob", size: 30 },
            { path: "package.json", type: "blob", size: 400 },
            { path: "src/app.ts", type: "blob", size: 500 },
            { path: "src/app.spec.ts", type: "blob", size: 250 },
            { path: ".github/workflows/ci.yml", type: "blob", size: 100 },
            { path: "vercel.json", type: "blob", size: 80 },
          ],
        },
      ],
      [
        "https://api.github.com/repos/SubJeeLee/hub/contents/package.json",
        {
          type: "file",
          path: "package.json",
          encoding: "base64",
          content: Buffer.from(
            JSON.stringify({
              packageManager: "npm@11.0.0",
              dependencies: { react: "^19.0.0" },
              devDependencies: { typescript: "^5.0.0" },
              scripts: { test: "jest", lint: "eslint ." },
            }),
          ).toString("base64"),
        },
      ],
      [
        "https://api.github.com/repos/SubJeeLee/hub/contents/src/app.ts",
        {
          type: "file",
          path: "src/app.ts",
          encoding: "base64",
          content: Buffer.from("export const app = true;").toString("base64"),
        },
      ],
      [
        "https://api.github.com/repos/SubJeeLee/hub/contents/src/app.spec.ts",
        {
          type: "file",
          path: "src/app.spec.ts",
          encoding: "base64",
          content: Buffer.from('describe("app", () => {});').toString("base64"),
        },
      ],
      [
        "https://api.github.com/repos/SubJeeLee/hub/contents/.github/workflows/ci.yml",
        {
          type: "file",
          path: ".github/workflows/ci.yml",
          encoding: "base64",
          content: Buffer.from("name: CI").toString("base64"),
        },
      ],
      [
        "https://api.github.com/repos/SubJeeLee/hub/contents/vercel.json",
        {
          type: "file",
          path: "vercel.json",
          encoding: "base64",
          content: Buffer.from('{"version":2}').toString("base64"),
        },
      ],
      [
        "https://api.github.com/repos/SubJeeLee/hub/pulls?state=all&per_page=30&sort=updated&direction=desc",
        [
          {
            number: 7,
            title: "분석 결과 화면 연결",
            state: "closed",
            user: { login: "SubJeeLee" },
            html_url: "https://github.com/SubJeeLee/hub/pull/7",
            created_at: "2026-07-15T01:00:00Z",
            merged_at: "2026-07-15T02:00:00Z",
            changed_files: 4,
            additions: 80,
            deletions: 10,
          },
        ],
      ],
      [
        "https://api.github.com/repos/SubJeeLee/hub/pulls/7/reviews",
        [{ user: { login: "camper" }, state: "APPROVED" }],
      ],
      [
        "https://api.github.com/repos/SubJeeLee/hub/issues?state=all&per_page=30&sort=updated&direction=desc",
        [
          {
            number: 8,
            title: "분석 결과 근거 추가",
            state: "open",
            user: { login: "camper" },
            html_url: "https://github.com/SubJeeLee/hub/issues/8",
            created_at: "2026-07-14T01:00:00Z",
            closed_at: null,
            comments: 2,
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
        changedFiles: ["src/app.ts"],
        additions: 20,
        deletions: 3,
      },
    ]);
    expect(result.readme).toEqual({
      path: "README.md",
      excerpt: "# PtoP\nRepository analysis",
      characterCount: 26,
    });
    expect(result.files).toEqual([
      {
        path: "README.md",
        type: "blob",
        size: 30,
        content: "# PtoP\nRepository analysis",
        contentAvailable: true,
      },
      {
        path: "package.json",
        type: "blob",
        size: 400,
        content: JSON.stringify({
          packageManager: "npm@11.0.0",
          dependencies: { react: "^19.0.0" },
          devDependencies: { typescript: "^5.0.0" },
          scripts: { test: "jest", lint: "eslint ." },
        }),
        contentAvailable: true,
      },
      {
        path: "src/app.ts",
        type: "blob",
        size: 500,
        content: "export const app = true;",
        contentAvailable: true,
      },
      {
        path: "src/app.spec.ts",
        type: "blob",
        size: 250,
        content: 'describe("app", () => {});',
        contentAvailable: true,
      },
      {
        path: ".github/workflows/ci.yml",
        type: "blob",
        size: 100,
        content: "name: CI",
        contentAvailable: true,
      },
      {
        path: "vercel.json",
        type: "blob",
        size: 80,
        content: '{"version":2}',
        contentAvailable: true,
      },
    ]);
    expect(result.packageManifest).toEqual({
      packageManager: "npm",
      frameworks: ["react", "typescript"],
      dependencies: ["react", "typescript"],
      scripts: ["lint", "test"],
    });
    expect(result.pullRequests).toEqual([
      {
        number: 7,
        title: "분석 결과 화면 연결",
        state: "closed",
        authorLogin: "SubJeeLee",
        url: "https://github.com/SubJeeLee/hub/pull/7",
        createdAt: "2026-07-15T01:00:00Z",
        mergedAt: "2026-07-15T02:00:00Z",
        changedFiles: 4,
        additions: 80,
        deletions: 10,
        reviewCount: 1,
        reviewerLogins: ["camper"],
      },
    ]);
    expect(result.issues).toEqual([
      {
        number: 8,
        title: "분석 결과 근거 추가",
        state: "open",
        authorLogin: "camper",
        url: "https://github.com/SubJeeLee/hub/issues/8",
        createdAt: "2026-07-14T01:00:00Z",
        closedAt: null,
        commentCount: 2,
      },
    ]);
    expect(result.treeTruncated).toBe(false);
    expect(result.warnings).toEqual([]);
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
