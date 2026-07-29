import { describe, expect, it } from "@jest/globals";
import type { TechnicalChallengeCandidate } from "@ptop/contracts";
import type { GitHubRepositoryAnalysisSource } from "../../domain/repository-analysis.models";
import { buildRepositoryCodeReferences } from "./technical-challenge.code-reference";

const candidate: TechnicalChallengeCandidate = {
  title: "분석 흐름 개선",
  summary: "분석 흐름을 연결했습니다.",
  background: null,
  problem: "결과와 회고가 분리되어 있었습니다.",
  solution: null,
  technicalChallenge: "분석 흐름 연결",
  whyItMatters: "사용자 경험에 영향을 줍니다.",
  confidence: "medium",
  requiresUserConfirmation: true,
  evidence: [
    {
      evidenceType: "file",
      referenceId: null,
      title: "분석 서비스",
      url: null,
      filePath: "src/analysis.ts",
    },
  ],
};

const source = {
  repository: {
    githubRepositoryId: 1,
    url: "https://github.com/owner/repository",
    owner: "owner",
    name: "repository",
    description: null,
    defaultBranch: "main",
    visibility: "public",
    isFork: false,
    isArchived: false,
    topics: [],
    licenseSpdxId: null,
    homepageUrl: null,
    githubCreatedAt: "2026-01-01T00:00:00.000Z",
    lastPushedAt: null,
    languages: { TypeScript: 100 },
  },
  contributors: [],
  commits: [],
  files: [
    {
      path: "src/analysis.ts",
      type: "blob" as const,
      size: 28,
      content: "export function analyze() {}",
      contentAvailable: true,
    },
    {
      path: "src/unused.ts",
      type: "blob" as const,
      size: 20,
      content: "export const unused = true;",
      contentAvailable: true,
    },
  ],
} satisfies GitHubRepositoryAnalysisSource;

describe("buildRepositoryCodeReferences", () => {
  it("returns only candidate-linked files with bounded source URLs", () => {
    expect(buildRepositoryCodeReferences(source, [candidate])).toEqual([
      {
        filePath: "src/analysis.ts",
        url: "https://github.com/owner/repository/blob/main/src/analysis.ts",
        language: "TypeScript",
        content: "export function analyze() {}",
      },
    ]);
  });

  it("does not expose arbitrary repository files when evidence has no file path", () => {
    expect(
      buildRepositoryCodeReferences(source, [{ ...candidate, evidence: [{ ...candidate.evidence[0], filePath: null }] }]),
    ).toEqual([]);
  });
});
