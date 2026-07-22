import { describe, expect, it } from "@jest/globals";
import type {
  RepositoryAnalysisEvidence,
  RepositoryAnalysisDetails,
  TechnicalChallengeCandidate,
} from "@ptop/contracts";
import type { TechnicalChallengeContext } from "./technical-challenge.models";
import {
  TechnicalChallengeResponseValidationError,
  parseTechnicalChallengeResponse,
} from "./technical-challenge.analyzer";
import { createTechnicalChallengePrompt } from "./technical-challenge.prompt";

const evidenceReference = {
  evidenceType: "file" as const,
  referenceId: null,
  title: "apps/api/src/main.ts",
  url: "https://github.com/owner/repository/blob/main/apps/api/src/main.ts",
  filePath: "apps/api/src/main.ts",
};

const evidence: RepositoryAnalysisEvidence = {
  ...evidenceReference,
  occurredAt: null,
  contributorLogin: null,
  metadata: {},
};

const candidate: TechnicalChallengeCandidate = {
  title: "API 분석 흐름 구조화",
  summary: "분석 요청을 단계별 데이터로 연결한 후보입니다.",
  background: "분석 결과를 화면과 저장소에서 함께 사용해야 했습니다.",
  problem: "수집 데이터의 구조가 일관되지 않았습니다.",
  solution: "공통 계약으로 결과 형태를 정리했습니다.",
  technicalChallenge: "외부 데이터를 안정적인 분석 결과로 변환했습니다.",
  whyItMatters: "결과의 근거를 추적할 수 있습니다.",
  confidence: "medium",
  requiresUserConfirmation: true,
  evidence: [evidenceReference],
};

const context = {
  repository: {
    githubRepositoryId: 1,
    url: "https://github.com/owner/repository",
    owner: "owner",
    name: "repository",
    description: "Repository description",
    defaultBranch: "main",
    visibility: "public",
    isFork: false,
    isArchived: false,
    topics: [],
    licenseSpdxId: null,
    homepageUrl: null,
    githubCreatedAt: "2026-01-01T00:00:00.000Z",
    lastPushedAt: "2026-07-20T00:00:00.000Z",
    languages: { TypeScript: 100 },
  },
  targetGithubLogin: null,
  targetActivity: {
    commits: [],
    pullRequests: [],
    issues: [],
    changedPaths: [],
  },
  analysis: {} as RepositoryAnalysisDetails,
  files: [
    {
      path: "apps/api/src/main.ts",
      content: "export function main() {}",
      priority: "high" as const,
      truncated: false,
      estimatedTokens: 6,
    },
  ],
  evidence: [evidence],
  estimatedTokens: 6,
  truncated: false,
} satisfies TechnicalChallengeContext;

describe("createTechnicalChallengePrompt", () => {
  it("includes evidence, context limits, and non-assertion guardrails", () => {
    const prompt = createTechnicalChallengePrompt(context);

    expect(prompt.systemPrompt).toContain("근거");
    expect(prompt.systemPrompt).toContain("역할");
    expect(prompt.systemPrompt).toContain("필드 이름을 바꾸거나 축약하지 마세요");
    expect(prompt.systemPrompt).toContain("evidenceType, referenceId, title, url, filePath");
    expect(prompt.systemPrompt).toContain("JSON");
    expect(prompt.userPrompt).toContain("apps/api/src/main.ts");
    expect(prompt.userPrompt).toContain("기술적 도전 후보");
    expect(prompt.temperature).toBe(0);
  });
});

describe("parseTechnicalChallengeResponse", () => {
  it("parses a structured candidate response", () => {
    const parsed = parseTechnicalChallengeResponse(JSON.stringify({ candidates: [candidate] }));

    expect(parsed).toEqual([candidate]);
  });

  it("removes a JSON code fence before parsing", () => {
    const response = `~~~json\n${JSON.stringify({ candidates: [candidate] })}\n~~~`;

    expect(parseTechnicalChallengeResponse(response)).toEqual([candidate]);
  });

  it("rejects candidates without evidence instead of inventing support", () => {
    const withoutEvidence = {
      ...candidate,
      evidence: [],
    };

    expect(() =>
      parseTechnicalChallengeResponse(JSON.stringify({ candidates: [withoutEvidence] })),
    ).toThrow(TechnicalChallengeResponseValidationError);
  });
});
