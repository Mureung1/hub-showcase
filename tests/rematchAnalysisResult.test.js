import assert from "node:assert/strict";
import test from "node:test";

import { rematchAnalysisResult } from "../src/services/rematchAnalysisResult.js";

test("프로필이 초기화되면 Gemini 재호출 없이 기존 공고를 정보 부족으로 다시 판정한다", () => {
  const result = rematchAnalysisResult({
    id: "analysis-test",
    analyzedAt: "2026-07-15T00:00:00.000Z",
    mode: "gemini",
    opportunity: {
      title: "전국 대학생 공모전",
      organizer: null,
      category: "contest",
      deadline: null,
      target: "전국 대학생",
      eligibility: [{
        type: "school",
        condition: "전국 대학생",
        evidence: "전국 대학생 참가 가능",
        required: true,
      }],
      preferred: [],
      requiredDocuments: [],
      benefits: [],
      activityPeriod: null,
      sourceUrl: null,
      uncertainFields: ["마감일"],
    },
    match: {
      status: "eligible",
      score: 90,
      summary: "이전 판정",
      matchedReasons: ["이전 근거"],
      missingInfo: [],
      disqualifyingReasons: [],
      nextActions: [],
    },
    tasks: [],
  }, null);

  assert.equal(result.mode, "gemini");
  assert.equal(result.match.status, "insufficient_info");
  assert.equal(result.match.score, null);
  assert.deepEqual(result.match.matchedReasons, []);
  assert.deepEqual(result.match.disqualifyingReasons, []);
  assert.deepEqual(result.match.missingInfo, ["사용자 프로필"]);
  assert.ok(result.tasks.some((task) => task.title === "마감일 확인"));
});
