import { Injectable } from "@nestjs/common";
import type {
  RepositoryAnalysisRequest,
  RepositoryAnalysisResult,
} from "@ptop/contracts";
import { GitHubRepositoryClient } from "./github-repository.client";
import { RepositoryAnalysisPersistence } from "./repository-analysis.persistence";
import {
  calculateCommitActivityPercent,
  createResultHash,
  parseGitHubRepositoryUrl,
} from "./repository-analysis.utils";

const ANALYZER_VERSION = "repository-v1";

export class InvalidRepositoryUrlError extends Error {
  constructor() {
    super("지원하는 GitHub Repository URL을 입력해 주세요.");
    this.name = "InvalidRepositoryUrlError";
  }
}

@Injectable()
export class RepositoryAnalysisService {
  constructor(
    private readonly githubClient: GitHubRepositoryClient,
    private readonly persistence: RepositoryAnalysisPersistence,
  ) {}

  async analyze(request: RepositoryAnalysisRequest): Promise<RepositoryAnalysisResult> {
    const location =
      typeof request.repositoryUrl === "string"
        ? parseGitHubRepositoryUrl(request.repositoryUrl.trim())
        : null;

    if (!location) {
      throw new InvalidRepositoryUrlError();
    }

    const targetGithubLogin = request.githubLogin?.trim() || null;
    const source = await this.githubClient.getRepositoryAnalysisSource(
      location.owner,
      location.repository,
    );
    const contributors = calculateCommitActivityPercent(source.contributors);
    const analyzedAt = new Date().toISOString();
    const resultHash = createResultHash({
      repository: source.repository,
      contributors,
      commits: source.commits,
    });
    const stored = await this.persistence.save({
      targetGithubLogin,
      analyzedAt,
      resultHash,
      analyzerVersion: ANALYZER_VERSION,
      source,
      contributors,
    });

    return {
      id: stored.analysisResultId,
      repository: {
        url: source.repository.url,
        owner: source.repository.owner,
        name: source.repository.name,
        description: source.repository.description,
        defaultBranch: source.repository.defaultBranch,
        languages: source.repository.languages,
      },
      contributors,
      commits: source.commits.map(({ sha, authorLogin, message, committedAt }) => ({
        sha,
        authorLogin,
        message,
        committedAt,
      })),
      contributionSummary: {
        metric: "commit_count",
        notice: "커밋 수 기반 활동 비율이며 실제 기여도나 작업 난이도를 의미하지 않습니다.",
      },
      analyzedAt,
    };
  }
}
