import assert from "node:assert/strict";
import { afterEach, test } from "vitest";
import { fetchRecommendations, RecommendationRequestError } from "../frontend/src/services/recommendations.js";

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
});

test("fetchRecommendations sends the fixed API contract", async () => {

  globalThis.fetch = async (url, options) => {
    assert.equal(url, "/api/recommendations");
    assert.equal(options.method, "POST");
    assert.deepEqual(JSON.parse(options.body), {
      mode: "noFire",
      maxMissingIngredients: 1,
      batchSize: 3,
      batchNumber: 2,
      excludedRecipeFingerprints: ["a".repeat(64)],
      allergens: [],
      excludedIngredients: [],
      dietaryPreferences: [],
    });
    return new Response(JSON.stringify({ recipes: [], meta: { source: "cache" } }));
  };

  const result = await fetchRecommendations({
    mode: "noFire",
    maxMissingIngredients: 1,
    batchNumber: 2,
    excludedRecipeFingerprints: ["a".repeat(64)],
  });

  assert.equal(result.meta.source, "cache");
});

test("fetchRecommendations exposes server errors to the UI", async () => {

  globalThis.fetch = async () => new Response(JSON.stringify({
    error: { code: "GEMINI_RATE_LIMITED", message: "무료 사용 한도를 초과했습니다." },
  }), { status: 503 });

  await assert.rejects(fetchRecommendations(), (error) => {
    assert.ok(error instanceof RecommendationRequestError);
    assert.equal(error.code, "GEMINI_RATE_LIMITED");
    assert.equal(error.status, 503);
    assert.equal(error.message, "무료 사용 한도를 초과했습니다.");
    return true;
  });
});
