import assert from "node:assert/strict";
import test from "node:test";
import { sampleAnalysisResults } from "../src/data/sampleAnalysisResults.js";
import { normalizeAnalysisResult } from "../src/utils/normalizeAnalysisResult.js";
import { analyzeResponseSchema } from "../server/schemas/analyzeSchemas.js";
import { mockAnalyzeOpportunity } from "../server/services/mockAnalyzeOpportunity.js";

const profile = {
  school: "경북대학교",
  grade: 2,
  majors: ["컴퓨터학부"],
  interests: ["AI", "소프트웨어"],
  regions: ["대구", "온라인"],
  canJoinTeam: true,
};

function assertStandardResult(result) {
  assert.doesNotThrow(() => analyzeResponseSchema.parse(result));
  assert.equal(typeof result.id, "string");
  assert.equal(typeof result.analyzedAt, "string");
  assert.ok(Array.isArray(result.opportunity.uncertainFields));
  assert.ok(Array.isArray(result.match.missingInfo));
  assert.ok(result.tasks.every((task) => task.id));
}

test("모든 정보가 있는 표준 결과를 유지한다", () => {
  const result = normalizeAnalysisResult(sampleAnalysisResults[0]);
  assertStandardResult(result);
  assert.equal(result.opportunity.deadline, "2026-08-31");
  assert.equal(result.match.status, "eligible");
  assert.equal(result.match.score, 90);
});

test("마감일이 없으면 null을 유지한다", () => {
  const result = normalizeAnalysisResult({
    mode: "mock",
    opportunity: { title: "마감일 미정 공고", uncertainFields: ["마감일"] },
    match: { status: "conditionally_eligible", score: 65, summary: "마감일 확인이 필요합니다." },
  });

  assertStandardResult(result);
  assert.equal(result.opportunity.deadline, null);
  assert.deepEqual(result.opportunity.uncertainFields, ["마감일"]);
});

test("불명확하고 불완전한 지원 조건은 꾸며내지 않고 제외한다", () => {
  const result = normalizeAnalysisResult({
    mode: "mock",
    opportunity: {
      eligibility: [{ type: "grade", condition: "2학년 이상" }],
    },
    match: {
      missingInfo: ["지원 조건"],
    },
  });

  assertStandardResult(result);
  assert.deepEqual(result.opportunity.eligibility, []);
  assert.equal(result.match.status, "insufficient_info");
});

test("사용자 조건과 맞지 않는 결과를 보존한다", () => {
  const result = normalizeAnalysisResult(sampleAnalysisResults[2]);
  assertStandardResult(result);
  assert.equal(result.match.status, "not_eligible");
  assert.ok(result.match.disqualifyingReasons.length > 0);
});

test("null과 빈 배열이 많은 입력도 표준 구조로 만든다", () => {
  const result = normalizeAnalysisResult({
    mode: "mock",
    opportunity: { title: null, organizer: null },
    match: { summary: "" },
    tasks: null,
  });

  assertStandardResult(result);
  assert.equal(result.opportunity.title, null);
  assert.equal(result.match.score, null);
  assert.deepEqual(result.opportunity.benefits, []);
  assert.deepEqual(result.tasks, []);
});

test("잘못된 category, status, score와 task를 안전한 값으로 정규화한다", () => {
  const result = normalizeAnalysisResult({
    mode: "unknown-provider",
    opportunity: { category: "invalid-category" },
    match: { status: "maybe", score: 999 },
    tasks: [{ title: "마감일 확인", status: "waiting" }],
  });

  assertStandardResult(result);
  assert.equal(result.mode, "mock");
  assert.equal(result.opportunity.category, "unknown");
  assert.equal(result.match.status, "insufficient_info");
  assert.equal(result.match.score, null);
  assert.equal(result.tasks[0].status, "todo");
  assert.match(result.tasks[0].id, /-task-1$/);
});

test("샘플 결과가 네 가지 지원 상태를 모두 포함한다", () => {
  const statuses = new Set(sampleAnalysisResults.map((result) => {
    assertStandardResult(result);
    return result.match.status;
  }));

  assert.deepEqual(statuses, new Set([
    "eligible",
    "conditionally_eligible",
    "not_eligible",
    "insufficient_info",
  ]));
});

test("mock 분석 함수도 표준 구조를 반환한다", async () => {
  const result = await mockAnalyzeOpportunity({
    profile,
    url: "https://example.com/notices/ai-contest",
    rawText: `2026 AI 소프트웨어 공모전 참가자 모집
대상: 전국 대학교 2학년 이상 재학생
주최: 한국소프트웨어진흥원
접수 마감: 2026년 8월 31일
제출 서류: 참가신청서, 프로젝트 계획서, 재학증명서
혜택: 대상 300만원, 우수상 100만원
활동 지역: 온라인
팀 참가 가능`,
  });

  assertStandardResult(result);
  assert.equal(result.mode, "mock");
  assert.equal(result.opportunity.category, "contest");
  assert.ok(result.tasks.every((task) => task.id));
});
