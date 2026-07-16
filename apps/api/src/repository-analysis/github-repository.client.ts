import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { GitHubRepositoryAnalysisSource } from "./repository-analysis.models";

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
      })),
    };
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
