import assert from "node:assert/strict";
import test from "node:test";
import {
  createCustomTechnicalChallengeCandidate,
  getSelectionBlockMessage,
  getSelectedCandidateIndex,
  toggleSelectedChallengeTitles,
} from "./repository-analysis/candidateSelection";

const candidate = (title: string) => ({
  title,
  summary: "summary",
  background: null,
  problem: null,
  solution: null,
  technicalChallenge: "challenge",
  whyItMatters: "why it matters",
  confidence: "medium" as const,
  requiresUserConfirmation: false,
  evidence: [],
});

test("selects and deselects a candidate explicitly", () => {
  assert.deepEqual(toggleSelectedChallengeTitles([], "API 안정성"), {
    titles: ["API 안정성"],
    blocked: false,
  });
  assert.deepEqual(toggleSelectedChallengeTitles(["API 안정성"], "API 안정성"), {
    titles: [],
    blocked: false,
  });
});

test("replaces the previous candidate when another candidate is selected", () => {
  assert.deepEqual(
    toggleSelectedChallengeTitles(["API 안정성"], "데이터 정합성"),
    { titles: ["데이터 정합성"], blocked: false },
  );
});

test("does not keep a second candidate from a legacy multi-selection", () => {
  assert.deepEqual(
    toggleSelectedChallengeTitles(["API 안정성", "상태 관리"], "API 안정성"),
    { titles: ["상태 관리"], blocked: false },
  );
});

test("restores the selected candidate detail when returning to the candidate step", () => {
  const candidates = [
    candidate("첫 번째 도전"),
    candidate("두 번째 도전"),
  ];

  assert.equal(getSelectedCandidateIndex(candidates, ["두 번째 도전"]), 1);
  assert.equal(getSelectedCandidateIndex(candidates, []), 0);
  assert.equal(getSelectedCandidateIndex(candidates, ["없는 후보"]), 0);
});

test("provides a blocking message when continuing without a selection", () => {
  assert.match(getSelectionBlockMessage([]), /하나 이상 선택/);
  assert.match(getSelectionBlockMessage(["API 안정성"]), /하나만/);
});

test("creates a user candidate with repository evidence for re-analysis", () => {
  const candidate = createCustomTechnicalChallengeCandidate("실시간 상태 동기화", "화면 간 상태가 어긋났습니다.", [
    {
      evidenceType: "pull_request",
      referenceId: "pr-1",
      title: "상태 동기화 수정",
      url: "https://github.com/example/repo/pull/1",
      filePath: null,
      occurredAt: null,
      contributorLogin: "user",
      metadata: {},
    },
  ]);

  assert.equal(candidate.title, "실시간 상태 동기화");
  assert.equal(candidate.evidence[0]?.evidenceType, "pull_request");
  assert.equal(candidate.requiresUserConfirmation, true);
});
