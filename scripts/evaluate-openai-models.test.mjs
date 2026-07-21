import test from "node:test";
import assert from "node:assert/strict";
import {
  createRequestBody,
  parseJsonContent,
  parseModelList,
  shouldOmitTemperature,
  validateTechnicalChallengeResponse,
} from "./evaluate-openai-models.lib.mjs";

const validCandidateResponse = {
  candidates: [
    {
      title: "API 분석 흐름 구조화",
      summary: "분석 요청을 단계별 데이터로 연결한 후보입니다.",
      background: "분석 결과를 화면과 저장소에서 함께 사용해야 했습니다.",
      problem: "수집 데이터의 구조가 일관되지 않았습니다.",
      solution: "공통 계약으로 결과 형태를 정리했습니다.",
      technicalChallenge: "외부 데이터를 안정적인 분석 결과로 변환했습니다.",
      whyItMatters: "결과의 근거를 추적할 수 있습니다.",
      confidence: "medium",
      requiresUserConfirmation: true,
      evidence: [
        {
          evidenceType: "file",
          referenceId: null,
          title: "API 진입점",
          url: null,
          filePath: "apps/api/src/main.ts",
        },
      ],
    },
  ],
};

test("parseModelList trims entries and removes duplicates", () => {
  assert.deepEqual(
    parseModelList(" gpt-4.1-mini, gpt-4.1, gpt-4.1-mini "),
    ["gpt-4.1-mini", "gpt-4.1"],
  );
});

test("createRequestBody uses the selected model and fixed prompt", () => {
  const body = createRequestBody("gpt-4.1", {
    systemPrompt: "system",
    userPrompt: "user",
    temperature: 0,
  });

  assert.deepEqual(body, {
    model: "gpt-4.1",
    messages: [
      { role: "system", content: "system" },
      { role: "user", content: "user" },
    ],
    temperature: 0,
    response_format: { type: "json_object" },
  });
});

test("createRequestBody omits unsupported temperature for affected models", () => {
  for (const model of ["gpt-5-mini", "gpt-5-mini-2025-08-07", "gpt-5.6-luna"]) {
    const body = createRequestBody(model, {
      systemPrompt: "system",
      userPrompt: "user",
      temperature: 0,
    });

    assert.equal(shouldOmitTemperature(model), true);
    assert.equal("temperature" in body, false);
  }

  assert.equal(shouldOmitTemperature("gpt-4.1"), false);
  assert.equal(shouldOmitTemperature("gpt-5.4-mini"), false);
});

test("validateTechnicalChallengeResponse accepts the PtoP output contract", () => {
  assert.deepEqual(validateTechnicalChallengeResponse(validCandidateResponse), {
    valid: true,
    candidateCount: 1,
    issues: [],
  });
});

test("validateTechnicalChallengeResponse reports missing fields and aliases", () => {
  const invalidResponse = {
    technicalChallenges: [
      {
        title: "후보",
        description: "기존 응답 필드",
        evidence: [{ evidenceType: "file", filePath: "main.ts" }],
      },
    ],
  };

  const result = validateTechnicalChallengeResponse(invalidResponse);

  assert.equal(result.valid, false);
  assert.equal(result.candidateCount, 0);
  assert.deepEqual(result.issues, [
    {
      path: "candidates",
      code: "missing_field",
      message: "candidates 배열이 필요합니다.",
    },
  ]);
});

test("parseJsonContent returns the structured message content", () => {
  const body = {
    id: "response-id",
    model: "gpt-4.1",
    usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
    choices: [{ message: { content: '{"candidates":[]}' } }],
  };

  assert.deepEqual(parseJsonContent(body), { candidates: [] });
});

test("parseJsonContent returns null for malformed or missing content", () => {
  assert.equal(parseJsonContent({ choices: [{ message: { content: "not-json" } }] }), null);
  assert.equal(parseJsonContent({ choices: [] }), null);
});
