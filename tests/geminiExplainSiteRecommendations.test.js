import assert from "node:assert/strict";
import test from "node:test";

import {
  geminiExplainSiteRecommendations,
  parseGeminiExplanationOutput,
} from "../server/services/geminiExplainSiteRecommendations.js";

test("추천 설명 parser는 구조화된 객체와 이전 배열 응답을 모두 안전하게 정규화한다", () => {
  const objectResult = parseGeminiExplanationOutput(JSON.stringify({
    explanations: [{
      siteId: "work24",
      recommendationReason: "인턴과 채용 정보를 함께 확인할 수 있습니다.",
      profileReasons: null,
    }],
  }));
  const arrayResult = parseGeminiExplanationOutput(JSON.stringify([
    { siteId: "nrf", complementaryReasons: null },
  ]));

  assert.equal(objectResult.explanations[0].siteId, "work24");
  assert.equal(objectResult.explanations[0].profileReasons, undefined);
  assert.equal(arrayResult.explanations[0].siteId, "nrf");
  assert.equal(arrayResult.explanations[0].complementaryReasons, undefined);
});

test("Gemini 추천 설명 요청은 JSON schema를 전달한다", async () => {
  const originalKey = process.env.GEMINI_API_KEY;
  process.env.GEMINI_API_KEY = "test-key";
  let request;
  const client = {
    models: {
      generateContent: async (input) => {
        request = input;
        return { text: JSON.stringify({ explanations: [{ siteId: "work24" }] }) };
      },
    },
  };

  try {
    const result = await geminiExplainSiteRecommendations({
      client,
      profile: null,
      recommendations: [{
        siteId: "work24",
        name: "고용24",
        recommendationReason: "기본 근거",
        profileReasons: [],
        complementaryReasons: [],
        informationTypes: ["internship"],
      }],
      trackedSites: [],
    });

    assert.equal(request.config.responseMimeType, "application/json");
    assert.equal(request.config.responseSchema.required.includes("explanations"), true);
    assert.equal(result.explanations[0].siteId, "work24");
  } finally {
    if (originalKey === undefined) delete process.env.GEMINI_API_KEY;
    else process.env.GEMINI_API_KEY = originalKey;
  }
});
