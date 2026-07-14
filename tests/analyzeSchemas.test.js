import assert from "node:assert/strict";
import test from "node:test";

import {
  ANALYSIS_RAW_TEXT_MAX_LENGTH,
  ANALYSIS_RAW_TEXT_MIN_LENGTH,
} from "../src/constants/opportunity.js";
import { analyzeRequestSchema } from "../server/schemas/analyzeSchemas.js";
import { mockAnalyzeOpportunity } from "../server/services/mockAnalyzeOpportunity.js";

const profile = {
  school: "경북대학교",
  grade: 2,
  majors: ["컴퓨터학부", "수학"],
  interests: ["AI", "소프트웨어", "공모전"],
  regions: ["대구", "온라인"],
  canJoinTeam: true,
  gpa: null,
  incomeBracket: null,
};

const validRawText = "2026 AI 소프트웨어 공모전 참가자를 모집합니다. 전국 대학교 2학년 이상 재학생이 대상입니다.";

test("본문 직접 입력과 sourceUrl null을 허용한다", () => {
  const result = analyzeRequestSchema.safeParse({
    profile,
    rawText: validRawText,
    sourceUrl: null,
  });

  assert.equal(result.success, true);
});

test("공고 본문이 비어 있고 URL도 없으면 거절한다", () => {
  const result = analyzeRequestSchema.safeParse({ profile, rawText: "   " });

  assert.equal(result.success, false);
  assert.match(result.error.issues[0].message, /URL|본문/);
});

test("공고 본문이 지나치게 짧으면 거절한다", () => {
  const result = analyzeRequestSchema.safeParse({
    profile,
    rawText: "가".repeat(ANALYSIS_RAW_TEXT_MIN_LENGTH - 1),
  });

  assert.equal(result.success, false);
  assert.ok(result.error.issues.some((issue) => issue.path[0] === "rawText"));
});

test("공고 본문 최대 길이를 넘으면 거절한다", () => {
  const result = analyzeRequestSchema.safeParse({
    profile,
    rawText: "가".repeat(ANALYSIS_RAW_TEXT_MAX_LENGTH + 1),
  });

  assert.equal(result.success, false);
  assert.ok(result.error.issues.some((issue) => issue.path[0] === "rawText"));
});

test("사용자 학년 정보가 null이어도 분석 입력으로 받는다", () => {
  const result = analyzeRequestSchema.safeParse({
    profile: { ...profile, grade: null },
    rawText: validRawText,
  });

  assert.equal(result.success, true);
});


test("사용자 학년이 없으면 충족으로 가정하거나 지원 불가로 판정하지 않는다", async () => {
  const result = await mockAnalyzeOpportunity({
    profile: { ...profile, grade: null },
    rawText: validRawText,
  });

  assert.notEqual(result.match.status, "not_eligible");
  assert.ok(result.match.missingInfo.includes("사용자 학년 정보"));
});

test("사용자 학년이 필수 학년보다 낮으면 지원 불가로 판정한다", async () => {
  const result = await mockAnalyzeOpportunity({
    profile: { ...profile, grade: 1 },
    rawText: validRawText,
  });

  assert.equal(result.match.status, "not_eligible");
  assert.ok(result.match.disqualifyingReasons.some((reason) => reason.includes("2학년 이상")));
});
