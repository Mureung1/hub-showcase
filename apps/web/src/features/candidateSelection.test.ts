import assert from "node:assert/strict";
import test from "node:test";
import {
  createCustomTechnicalChallengeCandidate,
  getSelectionBlockMessage,
  toggleSelectedChallengeTitles,
} from "./repository-analysis/candidateSelection";

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

test("blocks a third candidate when two candidates are already selected", () => {
  assert.deepEqual(
    toggleSelectedChallengeTitles(["API 안정성", "상태 관리"], "데이터 정합성"),
    { titles: ["API 안정성", "상태 관리"], blocked: true },
  );
});

test("keeps the other selection when one of two candidates is removed", () => {
  assert.deepEqual(
    toggleSelectedChallengeTitles(["API 안정성", "상태 관리"], "API 안정성"),
    { titles: ["상태 관리"], blocked: false },
  );
});

test("provides a blocking message when continuing without a selection", () => {
  assert.match(getSelectionBlockMessage([]), /하나 이상 선택/);
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
