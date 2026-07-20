import type { RepositoryAnalysisDetails } from "@ptop/contracts";
import type { GitHubRepositoryAnalysisSource } from "./repository-analysis.models";

export type EnrichedContributorMetric = {
  login: string;
  commitCount: number;
  authoredPrCount: number;
  mergedPrCount: number;
  reviewCount: number;
  issueCount: number;
  touchedPaths: string[];
  touchedExtensions: Record<string, number>;
  firstActivityAt: string | null;
  lastActivityAt: string | null;
};

export function createContributorMetrics(
  source: GitHubRepositoryAnalysisSource,
): EnrichedContributorMetric[] {
  const metrics = new Map<string, EnrichedContributorMetric>();
  const pullRequests = source.pullRequests ?? [];
  const issues = source.issues ?? [];

  const ensureMetric = (login: string | null) => {
    if (!login) {
      return null;
    }

    const existing = metrics.get(login);
    if (existing) {
      return existing;
    }

    const created: EnrichedContributorMetric = {
      login,
      commitCount: 0,
      authoredPrCount: 0,
      mergedPrCount: 0,
      reviewCount: 0,
      issueCount: 0,
      touchedPaths: [],
      touchedExtensions: {},
      firstActivityAt: null,
      lastActivityAt: null,
    };
    metrics.set(login, created);
    return created;
  };

  for (const contributor of source.contributors) {
    const metric = ensureMetric(contributor.login);
    if (metric) {
      metric.commitCount = contributor.commitCount;
    }
  }

  for (const commit of source.commits) {
    const metric = ensureMetric(commit.authorLogin);
    if (!metric) {
      continue;
    }

    for (const path of commit.changedFiles ?? []) {
      addUnique(metric.touchedPaths, path);
      const extension = getFileExtension(path);
      if (extension) {
        metric.touchedExtensions[extension] = (metric.touchedExtensions[extension] ?? 0) + 1;
      }
    }

    updateActivityRange(metric, commit.committedAt);
  }

  for (const pullRequest of pullRequests) {
    const author = ensureMetric(pullRequest.authorLogin);
    if (author) {
      author.authoredPrCount += 1;
      if (pullRequest.mergedAt) {
        author.mergedPrCount += 1;
      }
      updateActivityRange(author, pullRequest.mergedAt ?? pullRequest.createdAt);
    }

    for (const reviewerLogin of pullRequest.reviewerLogins) {
      const reviewer = ensureMetric(reviewerLogin);
      if (reviewer) {
        reviewer.reviewCount += 1;
        updateActivityRange(reviewer, pullRequest.createdAt);
      }
    }
  }

  for (const issue of issues) {
    const author = ensureMetric(issue.authorLogin);
    if (author) {
      author.issueCount += 1;
      updateActivityRange(author, issue.createdAt);
    }
  }

  return [...metrics.values()];
}

export function createAnalysisDetails(
  source: GitHubRepositoryAnalysisSource,
): RepositoryAnalysisDetails {
  const sourceFiles = source.files ?? [];
  const pullRequests = source.pullRequests ?? [];
  const issues = source.issues ?? [];
  const packageManifest = source.packageManifest ?? null;
  const files = sourceFiles.filter((file) => file.type === "blob");
  const topLevelDirectories = uniqueSorted(
    sourceFiles
      .map((file) => file.path.split("/")[0])
      .filter((path) => path && path !== ".github" && path.includes(".")),
  );
  const directoryNames = uniqueSorted(
    sourceFiles
      .map((file) => file.path.split("/")[0])
      .filter((path) => path && !path.includes(".")),
  );
  const entryPoints = files
    .map((file) => file.path)
    .filter((path) => /(^|\/)(main|index|app|server|client|bootstrap)\.(c|m)?[jt]sx?$/.test(path))
    .slice(0, 20);
  const testPaths = files
    .map((file) => file.path)
    .filter((path) => /(^|\/)(test|tests|__tests__)(\/|$)|\.(test|spec)\.[^.]+$/.test(path))
    .slice(0, 30);
  const ciPaths = files
    .map((file) => file.path)
    .filter((path) => path.startsWith(".github/workflows/") || path === ".gitlab-ci.yml")
    .slice(0, 20);
  const deploymentPaths = files
    .map((file) => file.path)
    .filter((path) =>
      /(^|\/)(Dockerfile|docker-compose[^/]*|vercel\.json|netlify\.toml|render\.yaml|render\.yml|fly\.toml|firebase\.json)$/.test(
        path,
      ),
    )
    .slice(0, 20);
  const hasTypeScript = files.some((file) => /\.tsx?$/.test(file.path));
  const hasLintScript = packageManifest?.scripts.includes("lint") ?? false;
  const hasTestScript = packageManifest?.scripts.some((script) =>
    /test/i.test(script),
  ) ?? false;

  return {
    repositorySnapshot: {
      readmeAvailable: Boolean(source.readme),
      readmePath: source.readme?.path ?? null,
      readmeExcerpt: source.readme?.excerpt ?? null,
      readmeCharacterCount: source.readme?.characterCount ?? 0,
    },
    techStack: {
      languages: source.repository.languages,
      packageManager: packageManifest?.packageManager ?? null,
      frameworks: packageManifest?.frameworks ?? [],
      dependencies: packageManifest?.dependencies ?? [],
      scripts: packageManifest?.scripts ?? [],
    },
    projectStructure: {
      fileCount: files.length,
      topLevelDirectories: directoryNames.length > 0 ? directoryNames : topLevelDirectories,
      entryPoints,
      testPaths,
      ciPaths,
      deploymentPaths,
      treeTruncated: source.treeTruncated ?? false,
    },
    qualitySignals: {
      hasReadme: Boolean(source.readme),
      hasTests: testPaths.length > 0 || hasTestScript,
      hasTypeScript,
      hasCi: ciPaths.length > 0,
      hasDeploymentConfig: deploymentPaths.length > 0,
      hasLintScript,
      hasTestScript,
    },
    collaborationSummary: {
      pullRequestCount: pullRequests.length,
      mergedPullRequestCount: pullRequests.filter((pullRequest) => pullRequest.mergedAt)
        .length,
      openPullRequestCount: pullRequests.filter((pullRequest) => pullRequest.state === "open")
        .length,
      issueCount: issues.length,
      openIssueCount: issues.filter((issue) => issue.state === "open").length,
      reviewCount: pullRequests.reduce(
        (total, pullRequest) => total + pullRequest.reviewCount,
        0,
      ),
    },
    warnings: source.warnings ?? [],
    evidence: createEvidence(source, files, testPaths, ciPaths, deploymentPaths),
  };
}

function createEvidence(
  source: GitHubRepositoryAnalysisSource,
  files: Array<{ path: string; type: "blob" | "tree"; size: number | null }>,
  testPaths: string[],
  ciPaths: string[],
  deploymentPaths: string[],
): RepositoryAnalysisDetails["evidence"] {
  const evidence: RepositoryAnalysisDetails["evidence"] = [];

  for (const commit of source.commits) {
    evidence.push({
      evidenceType: "commit",
      referenceId: commit.sha,
      title: firstLine(commit.message),
      url: commit.url,
      filePath: null,
      occurredAt: commit.committedAt,
      contributorLogin: commit.authorLogin,
      metadata: {
        changedFileCount: commit.changedFiles?.length ?? 0,
        additions: commit.additions ?? 0,
        deletions: commit.deletions ?? 0,
      },
    });
  }

  for (const pullRequest of source.pullRequests ?? []) {
    evidence.push({
      evidenceType: "pull_request",
      referenceId: String(pullRequest.number),
      title: pullRequest.title,
      url: pullRequest.url,
      filePath: null,
      occurredAt: pullRequest.createdAt,
      contributorLogin: pullRequest.authorLogin,
      metadata: {
        state: pullRequest.state,
        merged: Boolean(pullRequest.mergedAt),
        reviewCount: pullRequest.reviewCount,
        changedFiles: pullRequest.changedFiles,
        additions: pullRequest.additions,
        deletions: pullRequest.deletions,
      },
    });
  }

  for (const issue of source.issues ?? []) {
    evidence.push({
      evidenceType: "issue",
      referenceId: String(issue.number),
      title: issue.title,
      url: issue.url,
      filePath: null,
      occurredAt: issue.createdAt,
      contributorLogin: issue.authorLogin,
      metadata: {
        state: issue.state,
        commentCount: issue.commentCount,
      },
    });
  }

  const importantPaths = new Set([
    ...(source.readme ? [source.readme.path] : []),
    ...testPaths,
    ...ciPaths,
    ...deploymentPaths,
  ]);
  if (source.packageManifest) {
    importantPaths.add("package.json");
  }

  for (const file of files) {
    if (!importantPaths.has(file.path)) {
      continue;
    }

    const isConfig = /(^|\/)(package\.json|tsconfig[^/]*\.json|vite\.config\.[^/]+|nest-cli\.json)$/.test(
      file.path,
    );
    evidence.push({
      evidenceType: isConfig ? "config" : "file",
      referenceId: null,
      title: file.path,
      url: null,
      filePath: file.path,
      occurredAt: null,
      contributorLogin: null,
      metadata: { size: file.size },
    });
  }

  return evidence;
}

function updateActivityRange(metric: EnrichedContributorMetric, value: string): void {
  if (!metric.firstActivityAt || value < metric.firstActivityAt) {
    metric.firstActivityAt = value;
  }
  if (!metric.lastActivityAt || value > metric.lastActivityAt) {
    metric.lastActivityAt = value;
  }
}

function addUnique(values: string[], value: string): void {
  if (!values.includes(value)) {
    values.push(value);
  }
}

function getFileExtension(path: string): string | null {
  const filename = path.split("/").at(-1) ?? "";
  const extension = filename.includes(".") ? filename.split(".").at(-1) : null;
  return extension ? `.${extension}` : null;
}

function uniqueSorted(values: string[]): string[] {
  return [...new Set(values)].sort((left, right) => left.localeCompare(right));
}

function firstLine(value: string): string {
  return value.split("\n", 1)[0].trim();
}
