import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { GitHubRepositoryAnalysisSource } from "../../domain/repository-analysis.models";

const GITHUB_API_URL = "https://api.github.com";

export class GitHubRepositoryNotFoundError extends Error {
  constructor() {
    super("GitHub Repository를 찾을 수 없습니다.");
    this.name = "GitHubRepositoryNotFoundError";
  }
}

export class GitHubRateLimitError extends Error {
  constructor() {
    super("GitHub API 요청 한도를 초과했습니다.");
    this.name = "GitHubRateLimitError";
  }
}

export class GitHubRequestError extends Error {
  constructor(public readonly status: number) {
    super(`GitHub API 요청에 실패했습니다. (${status})`);
    this.name = "GitHubRequestError";
  }
}

type GitHubRepositoryResponse = {
  id: number;
  html_url: string;
  owner: { login: string };
  name: string;
  description: string | null;
  default_branch: string;
  visibility: "public" | "private" | "internal";
  fork: boolean;
  archived: boolean;
  topics?: string[];
  license: { spdx_id: string } | null;
  homepage: string | null;
  created_at: string;
  pushed_at: string | null;
};

type GitHubContributorResponse = {
  login?: string;
  contributions: number;
};

type GitHubCommitResponse = {
  sha: string;
  author: { login: string } | null;
  commit: {
    message: string;
    author: { date: string | null } | null;
    committer: { date: string | null } | null;
  };
  html_url: string;
};

type GitHubCommitDetailResponse = GitHubCommitResponse & {
  stats?: { additions?: number; deletions?: number };
  files?: Array<{ filename: string }>;
};

type GitHubContentResponse = {
  type: "file" | "dir";
  path: string;
  size?: number;
  encoding?: string;
  content?: string;
};

type GitHubTreeResponse = {
  truncated: boolean;
  tree: Array<{ path: string; type: "blob" | "tree"; size?: number }>;
};

type GitHubPullRequestResponse = {
  number: number;
  title: string;
  state: "open" | "closed";
  user: { login: string } | null;
  html_url: string;
  created_at: string;
  merged_at: string | null;
  changed_files?: number;
  additions?: number;
  deletions?: number;
};

type GitHubReviewResponse = {
  user: { login: string } | null;
  state: string;
};

type GitHubIssueResponse = {
  number: number;
  title: string;
  state: "open" | "closed";
  user: { login: string } | null;
  html_url: string;
  created_at: string;
  closed_at: string | null;
  comments: number;
  pull_request?: unknown;
};

const MAX_COMMIT_DETAILS = 30;
const MAX_PULL_REQUESTS = 30;
const MAX_ISSUES = 30;
const MAX_CONTEXT_FILES = 20;

@Injectable()
export class GitHubRepositoryClient {
  constructor(private readonly configService: ConfigService) {}

  async getRepositoryAnalysisSource(
    owner: string,
    repository: string,
  ): Promise<GitHubRepositoryAnalysisSource> {
    const repositoryPath = `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repository)}`;
    const metadata = await this.request<GitHubRepositoryResponse>(repositoryPath);
    const [languageBytes, contributors, commits] = await Promise.all([
      this.request<Record<string, number>>(`${repositoryPath}/languages`),
      this.request<GitHubContributorResponse[]>(`${repositoryPath}/contributors?per_page=100&anon=0`),
      this.request<GitHubCommitResponse[]>(`${repositoryPath}/commits?per_page=100`),
    ]);
    const warnings: string[] = [];
    const [readmeResponse, treeResponse, packageResponse, pullRequestResponse, issueResponse] =
      await Promise.all([
        this.requestOptional<GitHubContentResponse>(`${repositoryPath}/readme`, "README", warnings),
        this.requestOptional<GitHubTreeResponse>(
          `${repositoryPath}/git/trees/${encodeURIComponent(metadata.default_branch)}?recursive=1`,
          "파일 구조",
          warnings,
        ),
        this.requestOptional<GitHubContentResponse>(
          `${repositoryPath}/contents/package.json`,
          "package.json",
          warnings,
        ),
        this.requestOptional<GitHubPullRequestResponse[]>(
          `${repositoryPath}/pulls?state=all&per_page=${MAX_PULL_REQUESTS}&sort=updated&direction=desc`,
          "Pull Request",
          warnings,
        ),
        this.requestOptional<GitHubIssueResponse[]>(
          `${repositoryPath}/issues?state=all&per_page=${MAX_ISSUES}&sort=updated&direction=desc`,
          "Issue",
          warnings,
        ),
      ]);

    const [detailedCommits, pullRequests, issues] = await Promise.all([
      Promise.all(
        commits.slice(0, MAX_COMMIT_DETAILS).map((commit) =>
          this.requestOptional<GitHubCommitDetailResponse>(
            `${repositoryPath}/commits/${encodeURIComponent(commit.sha)}`,
            `commit ${commit.sha.slice(0, 7)}`,
            warnings,
          ),
        ),
      ),
      this.createPullRequestSummaries(owner, repository, pullRequestResponse ?? [], warnings),
      this.createIssueSummaries(issueResponse ?? []),
    ]);

    const detailedCommitMap = new Map(
      detailedCommits
        .filter((commit): commit is GitHubCommitDetailResponse => commit !== null)
        .map((commit) => [commit.sha, commit]),
    );
    const files = treeResponse?.tree.map((file) => ({
      path: file.path,
      type: file.type,
      size: file.size ?? null,
    })) ?? [];
    const readme = this.normalizeReadme(readmeResponse);
    const packageManifest = this.normalizePackageManifest(packageResponse);
    const filesWithContent = await this.fetchSelectedFileContents(
      repositoryPath,
      files,
      readmeResponse,
      packageResponse,
      warnings,
    );

    if (treeResponse?.truncated) warnings.push("파일 구조가 GitHub API 제한으로 일부만 반환되었습니다.");

    return {
      repository: {
        githubRepositoryId: metadata.id,
        url: metadata.html_url,
        owner: metadata.owner.login,
        name: metadata.name,
        description: metadata.description,
        defaultBranch: metadata.default_branch,
        visibility: metadata.visibility,
        isFork: metadata.fork,
        isArchived: metadata.archived,
        topics: metadata.topics ?? [],
        licenseSpdxId: metadata.license?.spdx_id ?? null,
        homepageUrl: metadata.homepage || null,
        githubCreatedAt: metadata.created_at,
        lastPushedAt: metadata.pushed_at,
        languages: toLanguagePercentages(languageBytes),
      },
      contributors: contributors
        .filter((contributor): contributor is GitHubContributorResponse & { login: string } =>
          Boolean(contributor.login),
        )
        .map((contributor) => ({
          login: contributor.login,
          commitCount: contributor.contributions,
        })),
      commits: commits.map((commit) => ({
        sha: commit.sha,
        authorLogin: commit.author?.login ?? null,
        message: commit.commit.message,
        committedAt:
          commit.commit.author?.date ??
          commit.commit.committer?.date ??
          new Date(0).toISOString(),
        url: commit.html_url,
        changedFiles: detailedCommitMap.get(commit.sha)?.files?.map((file) => file.filename) ?? [],
        additions: detailedCommitMap.get(commit.sha)?.stats?.additions ?? 0,
        deletions: detailedCommitMap.get(commit.sha)?.stats?.deletions ?? 0,
      })),
      readme,
      files: filesWithContent,
      packageManifest,
      pullRequests,
      issues,
      treeTruncated: treeResponse?.truncated ?? false,
      warnings,
    };
  }

  private async createPullRequestSummaries(
    owner: string,
    repository: string,
    pullRequests: GitHubPullRequestResponse[],
    warnings: string[],
  ): Promise<GitHubRepositoryAnalysisSource["pullRequests"]> {
    return Promise.all(
      pullRequests.slice(0, MAX_PULL_REQUESTS).map(async (pullRequest) => {
        const reviews = await this.requestOptional<GitHubReviewResponse[]>(
          `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repository)}/pulls/${pullRequest.number}/reviews`,
          `Pull Request #${pullRequest.number} 리뷰`,
          warnings,
        );

        return {
          number: pullRequest.number,
          title: pullRequest.title,
          state: pullRequest.state,
          authorLogin: pullRequest.user?.login ?? null,
          url: pullRequest.html_url,
          createdAt: pullRequest.created_at,
          mergedAt: pullRequest.merged_at,
          changedFiles: pullRequest.changed_files ?? null,
          additions: pullRequest.additions ?? null,
          deletions: pullRequest.deletions ?? null,
          reviewCount: reviews?.length ?? 0,
          reviewerLogins: unique(
            (reviews ?? [])
              .map((review) => review.user?.login)
              .filter((login): login is string => Boolean(login)),
          ),
        };
      }),
    );
  }

  private async fetchSelectedFileContents(
    repositoryPath: string,
    files: Array<{ path: string; type: "blob" | "tree"; size: number | null }>,
    readmeResponse: GitHubContentResponse | null,
    packageResponse: GitHubContentResponse | null,
    warnings: string[],
  ): Promise<GitHubRepositoryAnalysisSource["files"]> {
    const selectedPaths = files
      .filter((file) => file.type === "blob" && isContextCandidate(file.path))
      .sort((left, right) =>
        contextFilePriority(left.path) - contextFilePriority(right.path) ||
        left.path.localeCompare(right.path),
      )
      .slice(0, MAX_CONTEXT_FILES)
      .map((file) => file.path);
    const knownResponses = new Map<string, GitHubContentResponse | null>([
      [readmeResponse?.path ?? "", readmeResponse],
      [packageResponse?.path ?? "", packageResponse],
    ]);
    const fetchedResponses = await Promise.all(
      selectedPaths.map(async (path) => {
        if (knownResponses.has(path)) {
          return [path, knownResponses.get(path) ?? null] as const;
        }

        const content = await this.requestOptional<GitHubContentResponse>(
          `${repositoryPath}/contents/${encodePath(path)}`,
          `${path} 파일`,
          warnings,
        );
        return [path, content] as const;
      }),
    );
    const responses = new Map(fetchedResponses);

    return files.map((file) => {
      const response = responses.get(file.path);
      const content = response ? normalizeContent(response) : null;
      const contentFields =
        content === null
          ? { contentAvailable: false }
          : { content, contentAvailable: true };

      return {
        ...file,
        ...(responses.has(file.path) ? contentFields : {}),
      };
    });
  }

  private createIssueSummaries(
    issues: GitHubIssueResponse[],
  ): GitHubRepositoryAnalysisSource["issues"] {
    return issues
      .filter((issue) => !issue.pull_request)
      .slice(0, MAX_ISSUES)
      .map((issue) => ({
        number: issue.number,
        title: issue.title,
        state: issue.state,
        authorLogin: issue.user?.login ?? null,
        url: issue.html_url,
        createdAt: issue.created_at,
        closedAt: issue.closed_at,
        commentCount: issue.comments,
      }));
  }

  private normalizeReadme(
    response: GitHubContentResponse | null,
  ): GitHubRepositoryAnalysisSource["readme"] {
    if (!response || response.type !== "file" || !response.content) {
      return null;
    }

    const content = decodeBase64(response.content);
    return {
      path: response.path,
      excerpt: content.slice(0, 4_000),
      characterCount: content.length,
    };
  }

  private normalizePackageManifest(
    response: GitHubContentResponse | null,
  ): GitHubRepositoryAnalysisSource["packageManifest"] {
    if (!response || response.type !== "file" || !response.content) {
      return null;
    }

    try {
      const manifest = JSON.parse(decodeBase64(response.content)) as {
        packageManager?: unknown;
        dependencies?: Record<string, unknown>;
        devDependencies?: Record<string, unknown>;
        scripts?: Record<string, unknown>;
      };
      const dependencies = unique(
        Object.keys({ ...manifest.dependencies, ...manifest.devDependencies }).sort(),
      );

      return {
        packageManager:
          typeof manifest.packageManager === "string"
            ? manifest.packageManager.split("@", 1)[0]
            : inferPackageManager(dependencies),
        frameworks: dependencies.filter((dependency) =>
          /^(react|react-dom|next|vite|@nestjs\/|express|vue|svelte|angular|typescript)$/.test(
            dependency,
          ),
        ),
        dependencies: dependencies.slice(0, 50),
        scripts: Object.keys(manifest.scripts ?? {}).sort(),
      };
    } catch {
      return null;
    }
  }

  private async request<T>(path: string): Promise<T> {
    const token = this.configService.get<string>("GITHUB_TOKEN");
    const headers: Record<string, string> = {
      Accept: "application/vnd.github+json",
      "User-Agent": "PtoP",
      "X-GitHub-Api-Version": "2022-11-28",
    };

    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const response = await fetch(`${GITHUB_API_URL}${path}`, { headers });

    if (!response.ok) {
      if (response.status === 404) {
        throw new GitHubRepositoryNotFoundError();
      }

      if (
        response.status === 429 ||
        (response.status === 403 && response.headers.get("x-ratelimit-remaining") === "0")
      ) {
        throw new GitHubRateLimitError();
      }

      throw new GitHubRequestError(response.status);
    }

    return (await response.json()) as T;
  }

  private async requestOptional<T>(
    path: string,
    label: string,
    warnings: string[],
  ): Promise<T | null> {
    try {
      return await this.request<T>(path);
    } catch {
      warnings.push(`${label} 데이터를 확인하지 못했습니다.`);
      return null;
    }
  }
}

function decodeBase64(value: string): string {
  return Buffer.from(value.replace(/\n/g, ""), "base64").toString("utf8");
}

function unique(values: string[]): string[] {
  return [...new Set(values)];
}

function encodePath(path: string): string {
  return path.split("/").map((segment) => encodeURIComponent(segment)).join("/");
}

function normalizeContent(response: GitHubContentResponse): string | null {
  if (response.type !== "file" || !response.content) {
    return null;
  }

  return decodeBase64(response.content);
}

function isContextCandidate(path: string): boolean {
  return (
    /(^|\/)README(?:\.[^/]+)?$/i.test(path) ||
    /(^|\/)(package\.json|tsconfig[^/]*\.json|vite\.config\.[^/]+|nest-cli\.json)$/i.test(path) ||
    /(^|\/)(main|index|app|server|client|bootstrap)\.[^/]+$/i.test(path) ||
    /(^|\/)(api|controller|service|route|repository|feature)(\/|$)/i.test(path) ||
    /(^|\/)(test|tests|__tests__)(\/|$)|\.(test|spec)\.[^/.]+$/i.test(path) ||
    /(^|\/)(\.github\/workflows\/|\.gitlab-ci\.yml$|Dockerfile|docker-compose|vercel\.json|netlify\.toml)([^/]*)/i.test(path)
  );
}

function contextFilePriority(path: string): number {
  if (
    /(^|\/)README(?:\.[^/]+)?$/i.test(path) ||
    /(^|\/)(package\.json|tsconfig[^/]*\.json|vite\.config\.[^/]+|nest-cli\.json)$/i.test(path)
  ) {
    return 0;
  }

  if (/\.(test|spec)\.[^/.]+$/i.test(path) || /(^|\/)(test|tests|__tests__)(\/|$)/i.test(path)) {
    return 2;
  }

  return /(^|\/)(main|index|app|server|client|bootstrap)\.[^/]+$/i.test(path) ||
    /(^|\/)(api|controller|service|route|repository|feature)(\/|$)/i.test(path)
    ? 1
    : 2;
}

function inferPackageManager(dependencies: string[]): string | null {
  if (dependencies.includes("pnpm")) return "pnpm";
  if (dependencies.includes("yarn")) return "yarn";
  return "npm";
}

function toLanguagePercentages(languageBytes: Record<string, number>): Record<string, number> {
  const totalBytes = Object.values(languageBytes).reduce((total, bytes) => total + bytes, 0);

  return Object.fromEntries(
    Object.entries(languageBytes).map(([language, bytes]) => [
      language,
      totalBytes === 0 ? 0 : Math.round((bytes / totalBytes) * 10_000) / 100,
    ]),
  );
}
