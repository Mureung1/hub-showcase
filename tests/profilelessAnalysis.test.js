import assert from "node:assert/strict";
import { afterEach, test } from "node:test";

import { analyzeRequestSchema } from "../server/schemas/analyzeSchemas.js";
import { analyzeOpportunity } from "../server/services/analyzeOpportunity.js";
import { mockAnalyzeOpportunity } from "../server/services/mockAnalyzeOpportunity.js";
import { sampleAnalysisResults } from "../src/data/sampleAnalysisResults.js";
import { matchOpportunity } from "../src/services/matchOpportunity.js";

const rawText = `2026 AI 소프트웨어 공모전 참가자 모집
주최: 한국소프트웨어진흥원
대상: 전국 대학교 2학년 이상 재학생
접수 마감: 2026년 8월 31일
제출 서류: 참가신청서, 재학증명서
혜택: 대상 300만 원`;

const originalEnvironment = {
  AI_PROVIDER: process.env.AI_PROVIDER,
  ALLOW_LIVE_GEMINI: process.env.ALLOW_LIVE_GEMINI,
  GEMINI_API_KEY: process.env.GEMINI_API_KEY,
};

afterEach(() => {
  for (const [key, value] of Object.entries(originalEnvironment)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
});

test("분석 요청은 profile을 생략하거나 null로 전달할 수 있다", () => {
  const omitted = analyzeRequestSchema.safeParse({ rawText });
  const explicitNull = analyzeRequestSchema.safeParse({ profile: null, rawText });

  assert.equal(omitted.success, true);
  assert.equal(omitted.data.profile, null);
  assert.equal(explicitNull.success, true);
  assert.equal(explicitNull.data.profile, null);
});

test("프로필이 없으면 지원 가능성을 판정하지 않는 공통 match를 반환한다", () => {
  const match = matchOpportunity({
    profile: null,
    opportunity: sampleAnalysisResults[0].opportunity,
  });

  assert.equal(match.status, "insufficient_info");
  assert.equal(match.score, null);
  assert.deepEqual(match.matchedReasons, []);
  assert.deepEqual(match.disqualifyingReasons, []);
  assert.deepEqual(match.missingInfo, ["사용자 프로필"]);
  assert.match(match.summary, /판정하지 않았습니다/);
});

test("mock 분석도 프로필 없이 공고 핵심 정보를 구조화한다", async () => {
  const result = await mockAnalyzeOpportunity({ profile: null, rawText, url: null });

  assert.equal(result.opportunity.category, "contest");
  assert.match(result.opportunity.title, /AI 소프트웨어 공모전/);
  assert.ok(result.opportunity.requiredDocuments.includes("참가신청서"));
  assert.equal(result.match.score, null);
  assert.equal(result.match.matchedReasons.length, 0);
  assert.equal(result.match.disqualifyingReasons.length, 0);
});

test("Gemini가 적합성 값을 반환해도 서버가 프로필 없는 최종 결과를 미판정으로 고정한다", async () => {
  process.env.AI_PROVIDER = "gemini";
  process.env.ALLOW_LIVE_GEMINI = "true";
  process.env.GEMINI_API_KEY = "test-key";

  const result = await analyzeOpportunity({ profile: null, rawText }, {
    geminiAnalyzeOpportunity: async () => ({
      ...sampleAnalysisResults[0],
      mode: "gemini",
    }),
  });

  assert.equal(result.mode, "gemini");
  assert.equal(result.match.status, "insufficient_info");
  assert.equal(result.match.score, null);
  assert.deepEqual(result.match.matchedReasons, []);
  assert.deepEqual(result.match.disqualifyingReasons, []);
});
