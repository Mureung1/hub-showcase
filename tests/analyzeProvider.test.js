import assert from "node:assert/strict";
import { afterEach, test } from "node:test";

import { sampleAnalysisResults } from "../src/data/sampleAnalysisResults.js";
import {
  analyzeOpportunity,
  getAIConfig,
} from "../server/services/analyzeOpportunity.js";
import { getFriendlyGeminiError } from "../server/services/geminiAnalyzeOpportunity.js";

const ENV_KEYS = ["AI_PROVIDER", "ALLOW_LIVE_GEMINI", "GEMINI_API_KEY"];
const originalEnvironment = Object.fromEntries(ENV_KEYS.map((key) => [key, process.env[key]]));

const payload = {
  profile: {
    school: "경북대학교",
    grade: 2,
    majors: ["컴퓨터학부"],
    interests: ["AI", "소프트웨어", "공모전"],
    regions: ["대구", "온라인"],
    canJoinTeam: true,
  },
  rawText: `2026 AI 소프트웨어 공모전 참가자 모집
전국 대학교 2학년 이상 재학생이 대상입니다.
접수 마감은 2026년 8월 31일입니다.`,
};

function setEnvironment(values) {
  for (const key of ENV_KEYS) {
    const value = values[key];
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
}

afterEach(() => setEnvironment(originalEnvironment));

test("Gemini 호출은 provider, allow, key 세 조건이 모두 맞아야 활성화된다", () => {
  setEnvironment({
    AI_PROVIDER: "gemini",
    ALLOW_LIVE_GEMINI: "false",
    GEMINI_API_KEY: "test-key",
  });

  assert.equal(getAIConfig().liveGeminiEnabled, false);

  process.env.ALLOW_LIVE_GEMINI = "true";
  assert.equal(getAIConfig().liveGeminiEnabled, true);
});

test("Gemini가 비활성화되면 호출하지 않고 fallback 상태를 공개한다", async () => {
  setEnvironment({
    AI_PROVIDER: "gemini",
    ALLOW_LIVE_GEMINI: "false",
    GEMINI_API_KEY: "test-key",
  });

  let geminiCalled = false;
  const result = await analyzeOpportunity(payload, {
    geminiAnalyzeOpportunity: async () => {
      geminiCalled = true;
      return sampleAnalysisResults[0];
    },
  });

  assert.equal(geminiCalled, false);
  assert.equal(result.mode, "mock");
  assert.equal(result.fallbackUsed, true);
  assert.equal(result.fallbackReason, "Gemini API 호출 비활성화");
});

test("Gemini 키가 없으면 실제 호출 없이 mock으로 처리한다", async () => {
  setEnvironment({
    AI_PROVIDER: "gemini",
    ALLOW_LIVE_GEMINI: "true",
    GEMINI_API_KEY: undefined,
  });

  const result = await analyzeOpportunity(payload);

  assert.equal(result.mode, "mock");
  assert.equal(result.fallbackUsed, true);
  assert.equal(result.fallbackReason, "Gemini API 키 없음");
});

test("세 조건이 충족되면 Gemini 서비스 결과를 반환한다", async () => {
  setEnvironment({
    AI_PROVIDER: "gemini",
    ALLOW_LIVE_GEMINI: "true",
    GEMINI_API_KEY: "test-key",
  });

  const result = await analyzeOpportunity(payload, {
    geminiAnalyzeOpportunity: async () => ({
      ...sampleAnalysisResults[0],
      mode: "gemini",
    }),
  });

  assert.equal(result.mode, "gemini");
  assert.equal(result.fallbackUsed, false);
});

test("Gemini가 공고 기반 태스크를 반환하면 고정 템플릿으로 덮어쓰지 않는다", async () => {
  setEnvironment({
    AI_PROVIDER: "gemini",
    ALLOW_LIVE_GEMINI: "true",
    GEMINI_API_KEY: "test-key",
  });

  const result = await analyzeOpportunity(payload, {
    geminiAnalyzeOpportunity: async () => ({
      ...sampleAnalysisResults[0],
      mode: "gemini",
      tasks: [{
        id: "project-plan",
        title: "프로젝트 계획서 초안 작성",
        dueDate: "2026-08-20",
        status: "todo",
      }],
    }),
  });

  assert.deepEqual(result.tasks, [{
    id: "project-plan",
    title: "프로젝트 계획서 초안 작성",
    dueDate: "2026-08-20",
    status: "todo",
  }]);
});
test("Gemini 호출 실패 시 서버가 죽지 않고 명시적인 mock fallback을 반환한다", async () => {
  setEnvironment({
    AI_PROVIDER: "gemini",
    ALLOW_LIVE_GEMINI: "true",
    GEMINI_API_KEY: "test-key",
  });

  const result = await analyzeOpportunity(payload, {
    geminiAnalyzeOpportunity: async () => {
      const error = new Error("quota exceeded");
      error.status = 429;
      throw error;
    },
  });

  assert.equal(result.mode, "mock");
  assert.equal(result.fallbackUsed, true);
  assert.equal(result.fallbackReason, "Gemini API 요청 실패");
});

test("JSON 파싱과 네트워크 오류는 사용자 친화적인 문구로 분류한다", () => {
  assert.match(getFriendlyGeminiError(new SyntaxError("invalid JSON")), /JSON/);
  assert.match(getFriendlyGeminiError(new Error("network fetch failed")), /네트워크/);
});
