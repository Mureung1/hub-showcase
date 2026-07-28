import test from "node:test";
import assert from "node:assert/strict";
import type { TechnicalChallengeCandidate } from "@ptop/contracts";
import { rankCandidatesByReflection } from "./reflectionCandidateRanking";

const candidate = (title: string, summary: string): TechnicalChallengeCandidate => ({
  title,
  summary,
  background: null,
  problem: null,
  solution: null,
  technicalChallenge: summary,
  whyItMatters: "포트폴리오 근거",
  confidence: "medium",
  requiresUserConfirmation: true,
  evidence: [{
    evidenceType: "pull_request",
    referenceId: title,
    title: `${title} PR`,
    url: null,
    filePath: null,
  }],
});

test("prioritizes candidates that overlap with the analysis-time reflection", () => {
  const ranked = rankCandidatesByReflection(
    [
      candidate("배포 자동화", "배포 파이프라인을 정리했습니다."),
      candidate("분석 결과 연결", "분석 결과와 회고 저장 흐름을 연결했습니다."),
    ],
    "분석 결과와 회고를 연결하는 과정이 가장 어려웠습니다.",
  );

  assert.equal(ranked[0]?.title, "분석 결과 연결");
});
