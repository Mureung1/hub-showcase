import type { RepositoryAnalysisDetails } from "@ptop/contracts";
import type { GitHubRepositoryAnalysisSource } from "./repository-analysis.models";
import type { RepositoryContextFile, TechnicalChallengeContext } from "./technical-challenge.models";

export const TECHNICAL_CHALLENGE_CONTEXT_LIMITS = {
  maxFiles: 20,
  maxCharactersPerFile: 6_000,
  maxCharactersTotal: 40_000,
  charactersPerEstimatedToken: 4,
} as const;

const CRITICAL_PATHS = [
  /^README(?:\.[^/]+)?$/i,
  /(^|\/)package\.json$/i,
  /(^|\/)tsconfig[^/]*\.json$/i,
  /(^|\/)vite\.config\.[^/]+$/i,
  /(^|\/)nest-cli\.json$/i,
];

const HIGH_PATHS = [
  /(^|\/)(main|index|app|server|client|bootstrap)\.[^/]+$/i,
  /(^|\/)(api|controller|service|route|repository|feature)(\/|$)/i,
];

const NORMAL_PATHS = [
  /(^|\/)(test|tests|__tests__)(\/|$)/i,
  /\.(test|spec)\.[^/.]+$/i,
  /(^|\/)(\.github\/workflows|\.gitlab-ci\.yml|Dockerfile|docker-compose|vercel\.json|netlify\.toml)([^/]*)$/i,
];

export function buildTechnicalChallengeContext(
  source: GitHubRepositoryAnalysisSource,
  analysis: RepositoryAnalysisDetails,
): TechnicalChallengeContext {
  const candidates = (source.files ?? [])
    .filter((file) => file.type === "blob" && file.contentAvailable !== false && file.content)
    .filter((file) => isTextFile(file.path))
    .map((file) => ({
      path: file.path,
      content: file.content ?? "",
      priority: getPriority(file.path),
    }))
    .sort((left, right) =>
      priorityRank(left.priority) - priorityRank(right.priority) || left.path.localeCompare(right.path),
    );

  let remainingCharacters = TECHNICAL_CHALLENGE_CONTEXT_LIMITS.maxCharactersTotal;
  let truncated = candidates.length > TECHNICAL_CHALLENGE_CONTEXT_LIMITS.maxFiles;
  const files: RepositoryContextFile[] = [];

  for (const candidate of candidates.slice(0, TECHNICAL_CHALLENGE_CONTEXT_LIMITS.maxFiles)) {
    if (remainingCharacters <= 0) {
      truncated = true;
      break;
    }

    const maxLength = Math.min(
      candidate.content.length,
      TECHNICAL_CHALLENGE_CONTEXT_LIMITS.maxCharactersPerFile,
      remainingCharacters,
    );
    const content = candidate.content.slice(0, maxLength);
    const fileTruncated = content.length < candidate.content.length;

    files.push({
      path: candidate.path,
      content,
      priority: candidate.priority,
      truncated: fileTruncated,
      estimatedTokens: estimateTokens(content),
    });

    remainingCharacters -= content.length;
    truncated ||= fileTruncated;
  }

  const totalCharacters = files.reduce((total, file) => total + file.content.length, 0);

  return {
    repository: source.repository,
    analysis,
    files,
    evidence: analysis.evidence,
    estimatedTokens: Math.ceil(
      totalCharacters / TECHNICAL_CHALLENGE_CONTEXT_LIMITS.charactersPerEstimatedToken,
    ),
    truncated,
  };
}

function getPriority(path: string): RepositoryContextFile["priority"] {
  if (CRITICAL_PATHS.some((pattern) => pattern.test(path))) {
    return "critical";
  }

  if (NORMAL_PATHS.some((pattern) => pattern.test(path))) {
    return "normal";
  }

  if (HIGH_PATHS.some((pattern) => pattern.test(path))) {
    return "high";
  }

  return "normal";
}

function priorityRank(priority: RepositoryContextFile["priority"]): number {
  return priority === "critical" ? 0 : priority === "high" ? 1 : 2;
}

function estimateTokens(content: string): number {
  return Math.ceil(content.length / TECHNICAL_CHALLENGE_CONTEXT_LIMITS.charactersPerEstimatedToken);
}

function isTextFile(path: string): boolean {
  return !/(^|\/)(node_modules|dist|build|coverage)(\/|$)/.test(path) &&
    !/\.(lock|png|jpe?g|gif|webp|ico|woff2?|ttf|eot|zip|pdf)$/i.test(path);
}
