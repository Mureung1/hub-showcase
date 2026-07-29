import type { RepositoryCodeReference, TechnicalChallengeCandidate } from "@ptop/contracts";
import type { GitHubRepositoryAnalysisSource } from "../../domain/repository-analysis.models";

const MAX_CODE_REFERENCES = 4;
const MAX_SOURCE_CHARACTERS = 4_000;

export function buildRepositoryCodeReferences(
  source: GitHubRepositoryAnalysisSource,
  candidates: TechnicalChallengeCandidate[],
): RepositoryCodeReference[] {
  const evidencePaths = new Set(
    candidates.flatMap((candidate) =>
      candidate.evidence
        .map((evidence) => evidence.filePath?.trim())
        .filter((path): path is string => Boolean(path)),
    ),
  );

  if (evidencePaths.size === 0) {
    return [];
  }

  return (source.files ?? [])
    .filter(
      (file) =>
        file.type === "blob" &&
        evidencePaths.has(file.path) &&
        file.contentAvailable !== false &&
        typeof file.content === "string" &&
        file.content.trim().length > 0,
    )
    .slice(0, MAX_CODE_REFERENCES)
    .map((file) => ({
      filePath: file.path,
      url: createBlobUrl(source.repository.url, source.repository.defaultBranch, file.path),
      language: inferLanguage(file.path),
      content: file.content!.slice(0, MAX_SOURCE_CHARACTERS),
    }));
}

function createBlobUrl(repositoryUrl: string, branch: string, filePath: string): string {
  const encodedPath = filePath.split("/").map((segment) => encodeURIComponent(segment)).join("/");
  return `${repositoryUrl}/blob/${encodeURIComponent(branch)}/${encodedPath}`;
}

function inferLanguage(filePath: string): string {
  const extension = filePath.split(".").pop()?.toLowerCase();
  const languages: Record<string, string> = {
    ts: "TypeScript",
    tsx: "TSX",
    js: "JavaScript",
    jsx: "JSX",
    mjs: "JavaScript",
    cjs: "JavaScript",
    css: "CSS",
    scss: "SCSS",
    html: "HTML",
    json: "JSON",
    yml: "YAML",
    yaml: "YAML",
    py: "Python",
    java: "Java",
    go: "Go",
    rs: "Rust",
  };

  return languages[extension ?? ""] ?? "Code";
}
