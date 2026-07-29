import test from "node:test";
import assert from "node:assert/strict";
import type { PortfolioDraft, ReflectionAnalysis, RepositoryAnalysisResult } from "@ptop/contracts";
import type { ReflectionDraft } from "../reflection/reflection";
import {
  createChallengeKey,
  createPortfolioProjectPayload,
} from "./portfolioLibrary";

const draft: ReflectionDraft = {
  motivation: "",
  role: "",
  memorableProblem: "",
  postAnalysisReflection: "내가 해결한 문제",
  attempts: "",
  improvement: "",
  customChallengeTitle: "",
  customChallengeNote: "",
  selectedChallengeTitles: ["렌더링 병목 개선"],
  challengeAnswers: {},
};

const portfolioDraft: PortfolioDraft = {
  title: "렌더링 병목 개선",
  technicalChallenge: "렌더링 병목 개선",
  background: "배경",
  problem: "문제",
  solution: "해결",
  contribution: "기여",
  evidenceSummary: "근거",
  requiresUserReview: false,
};

const analysis: ReflectionAnalysis = {
  alignment: "matched",
  matchedChallengeTitle: "렌더링 병목 개선",
  matchedChallengeEvidence: [],
  message: "matched",
  portfolioSummary: "요약",
  portfolioDraft,
  requiresUserConfirmation: false,
};

const result = {
  id: "analysis-1",
  repository: {
    id: 1,
    owner: "owner",
    name: "repo",
    fullName: "owner/repo",
    url: "https://github.com/owner/repo",
    defaultBranch: "main",
    description: null,
    visibility: "public",
    isFork: false,
    isArchived: false,
    topics: [],
    licenseSpdxId: null,
    homepageUrl: null,
    githubCreatedAt: "2026-01-01T00:00:00.000Z",
    lastPushedAt: null,
  },
  contributors: [],
  commits: [],
  contributionSummary: { metric: "commit_count", notice: "" },
  analysis: {
    techStack: [],
    projectStructure: [],
    qualitySignals: [],
    collaborationSummary: "",
    activitySummary: "",
    technicalChallenges: [],
    warnings: [],
    evidence: [],
  },
  analyzedAt: "2026-01-02T00:00:00.000Z",
} as unknown as RepositoryAnalysisResult;

test("challenge keys are stable and distinguish different challenges", () => {
  assert.equal(createChallengeKey("렌더링 병목 개선"), "렌더링-병목-개선");
  assert.notEqual(
    createChallengeKey("렌더링 병목 개선"),
    createChallengeKey("인증 흐름 개선"),
  );
});
test("portfolio payload keeps repository and selected challenge as the library identity", () => {
  const payload = createPortfolioProjectPayload({
    userId: "user-1",
    result,
    reflectionDraft: draft,
    reflectionAnalysis: analysis,
  });

  assert.deepEqual(
    {
      user_id: payload.user_id,
      repository_url: payload.repository_url,
      challenge_key: payload.challenge_key,
      challenge_title: payload.challenge_title,
    },
    {
      user_id: "user-1",
      repository_url: "https://github.com/owner/repo",
      challenge_key: "렌더링-병목-개선",
      challenge_title: "렌더링 병목 개선",
    },
  );
  assert.equal(payload.portfolio_draft.title, "렌더링 병목 개선");
  assert.equal(payload.workspace_slot, null);
});
