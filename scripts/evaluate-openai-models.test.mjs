import test from "node:test";
import assert from "node:assert/strict";
import {
  createRequestBody,
  parseJsonContent,
  parseModelList,
  shouldOmitTemperature,
} from "./evaluate-openai-models.lib.mjs";

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
