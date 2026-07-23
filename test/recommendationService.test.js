import assert from "node:assert/strict";
import { test } from "vitest";

import { createRecommendationService } from "../server/services/recommendationService.js";

const request = {
  mode: "quick",
  maxMissingIngredients: 0,
  batchSize: 3,
  excludedRecipeFingerprints: [],
  allergens: [],
  excludedIngredients: [],
  dietaryPreferences: [],
};

const ingredientRows = [{
  name: "삼겹살",
  category: "meat",
  subcategory: "pork",
  tags: ["nutrition:protein"],
  quantity: 500,
  unit: "g",
  quantity_mode: "exact",
  storage: "fridge",
  expiration_type: "absolute",
  expiration_date: "2026-07-24",
  shelf_life_days: null,
  stored_at: "2026-07-20",
  is_staple: false,
  is_instant: false,
  is_prepared: false,
}];

function generatedRecipe(index) {
  return {
    name: `삼겹살 메뉴 ${index}`,
    servings: 1,
    requiredIngredients: [{ name: "삼겹살", amount: 200, unit: "g" }],
    optionalIngredients: [],
    cookingTime: 15,
    difficulty: "easy",
    cookingMethod: "fire",
    dishType: ["stirFry", "riceBowl", "stew"][index - 1],
    effortLevel: "low",
    recommendationReasons: ["보유 재료 활용"],
    nutritionTags: ["nutrition:protein"],
    nutritionSummary: "단백질 중심 메뉴",
    steps: ["재료를 손질해요.", "충분히 익혀요."],
    safetyNotes: ["고기를 충분히 익혀요."],
  };
}

function createSupabaseClient(rows = ingredientRows) {
  return {
    from(table) {
      assert.equal(table, "ingredients");
      return {
        select() { return Promise.resolve({ data: rows, error: null }); },
      };
    },
  };
}

test("유효한 캐시가 있으면 Gemini를 호출하지 않는다", async () => {
  let generateCalled = false;
  const cachedRecipes = [1, 2, 3].map((index) => ({
    ...generatedRecipe(index),
    id: `recipe-${index}`,
    fingerprint: String(index).padStart(64, "0"),
    missingIngredients: [],
  }));
  const service = createRecommendationService({
    supabaseClient: createSupabaseClient(),
    geminiClient: { generate() { generateCalled = true; } },
    cacheStore: {
      get: async () => ({
        recipes: cachedRecipes,
        model: "cached-model",
        batch_number: 1,
        generated_at: "2026-07-22T01:00:00Z",
        expires_at: "2026-07-22T15:00:00Z",
      }),
    },
    now: () => new Date("2026-07-22T06:00:00Z"),
  });

  const result = await service.recommend(request);
  assert.equal(result.meta.source, "cache");
  assert.equal(generateCalled, false);
});

test("캐시가 없으면 Gemini 결과를 정책 검증 후 저장한다", async () => {
  let saved;
  const service = createRecommendationService({
    supabaseClient: createSupabaseClient(),
    geminiClient: {
      model: "test-model",
      generate: async () => ({
        generated: { recipes: [1, 2, 3].map(generatedRecipe) },
        metadata: { model: "test-model", durationMs: 10 },
      }),
    },
    cacheStore: {
      get: async () => null,
      set: async (value) => {
        saved = value;
        return {
          generated_at: "2026-07-22T06:00:00Z",
          expires_at: "2026-07-22T15:00:00Z",
        };
      },
    },
    now: () => new Date("2026-07-22T06:00:00Z"),
  });

  const result = await service.recommend(request);
  assert.equal(result.meta.source, "gemini");
  assert.equal(result.recipes.length, 3);
  assert.equal(saved.recipes.length, 3);
});

test("추천 가능한 재료가 없으면 Gemini를 호출하지 않고 422 오류를 반환한다", async () => {
  const service = createRecommendationService({
    supabaseClient: createSupabaseClient([]),
    geminiClient: { generate() { throw new Error("호출되면 안 됩니다"); } },
    cacheStore: { get: async () => null },
  });

  await assert.rejects(
    () => service.recommend(request),
    (error) => error.code === "NO_AVAILABLE_INGREDIENTS" && error.status === 422,
  );
});

test("Supabase 재료 조회 실패를 503 서비스 오류로 변환한다", async () => {
  const service = createRecommendationService({
    supabaseClient: {
      from(table) {
        assert.equal(table, "ingredients");
        return {
          select() {
            return Promise.resolve({
              data: null,
              error: new Error("mock database failure"),
            });
          },
        };
      },
    },
    geminiClient: { generate() { throw new Error("호출되면 안 됩니다"); } },
    cacheStore: { get: async () => null },
  });

  await assert.rejects(
    () => service.recommend(request),
    (error) => error.code === "INGREDIENTS_UNAVAILABLE"
      && error.status === 503
      && error.cause instanceof Error,
  );
});
