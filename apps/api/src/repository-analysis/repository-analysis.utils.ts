import { createHash } from "node:crypto";

export type GitHubRepositoryLocation = {
  owner: string;
  repository: string;
};

type ContributorCommitCount = {
  login: string;
  commitCount: number;
};

export function parseGitHubRepositoryUrl(value: string): GitHubRepositoryLocation | null {
  const match = value.match(
    /^https:\/\/github\.com\/([A-Za-z0-9](?:[A-Za-z0-9-]{0,38}))\/([A-Za-z0-9._-]+?)(?:\.git)?\/?$/,
  );

  if (!match) {
    return null;
  }

  return {
    owner: match[1],
    repository: match[2],
  };
}

export function calculateCommitActivityPercent<T extends ContributorCommitCount>(contributors: T[]) {
  const totalCommitCount = contributors.reduce(
    (total, contributor) => total + contributor.commitCount,
    0,
  );

  return contributors.map((contributor) => ({
    ...contributor,
    commitActivityPercent:
      totalCommitCount === 0
        ? 0
        : Math.round((contributor.commitCount / totalCommitCount) * 10_000) / 100,
  }));
}

export function createResultHash(input: unknown): string {
  return createHash("sha256").update(JSON.stringify(sortObjectKeys(input))).digest("hex");
}

function sortObjectKeys(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sortObjectKeys);
  }

  if (value !== null && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, nestedValue]) => [key, sortObjectKeys(nestedValue)]),
    );
  }

  return value;
}
