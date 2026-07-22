import assert from "node:assert/strict";
import test from "node:test";

import {
  createRecommendationCacheKey,
  createRecommendationCacheStore,
  getRecommendationBatchNumber,
} from "../server/services/recommendationCache.js";

const request = {
  mode: "quick",
  maxMissingIngredients: 0,
  batchSize: 3,
  excludedRecipeFingerprints: [],
  allergens: [],
  excludedIngredients: [],
  dietaryPreferences: [],
};

function createQuery(result) {
  const query = {
    select() { return query; },
    eq() { return query; },
    gt() { return query; },
    maybeSingle() { return Promise.resolve(result); },
    upsert(row) { query.row = row; return query; },
    single() { return Promise.resolve(result); },
  };
  return query;
}

test("같은 날짜와 조건은 배열 순서가 달라도 같은 캐시 키를 만든다", () => {
  const now = new Date("2026-07-22T06:00:00Z");
  const first = createRecommendationCacheKey({
    inventorySignature: "a".repeat(64),
    request: { ...request, allergens: ["우유", "계란"] },
    now,
  });
  const second = createRecommendationCacheKey({
    inventorySignature: "a".repeat(64),
    request: { ...request, allergens: ["계란", "우유"] },
    now,
  });
  assert.equal(first, second);
});

test("한국 날짜가 바뀌면 같은 재료와 조건도 다른 캐시 키를 만든다", () => {
  const first = createRecommendationCacheKey({
    inventorySignature: "a".repeat(64),
    request,
    now: new Date("2026-07-22T14:59:59Z"),
  });
  const second = createRecommendationCacheKey({
    inventorySignature: "a".repeat(64),
    request,
    now: new Date("2026-07-22T15:00:00Z"),
  });
  assert.notEqual(first, second);
});

test("제외 fingerprint 개수로 1~5회차를 계산한다", () => {
  assert.equal(getRecommendationBatchNumber(request), 1);
  assert.equal(getRecommendationBatchNumber({
    ...request,
    excludedRecipeFingerprints: Array.from({ length: 12 }, (_, index) => String(index).padStart(64, "0")),
  }), 5);
});

test("캐시 저장 시 한국 시간 다음 자정을 만료 시각으로 사용한다", async () => {
  const query = createQuery({ data: { cache_key: "key" }, error: null });
  const store = createRecommendationCacheStore({
    supabaseClient: { from: () => query },
    now: () => new Date("2026-07-22T06:00:00Z"),
  });
  await store.set({
    cacheKey: "key",
    inventorySignature: "a".repeat(64),
    request,
    recipes: [],
    model: "test-model",
  });

  assert.equal(query.row.expires_at, "2026-07-22T15:00:00.000Z");
  assert.equal(query.row.batch_number, 1);
});
