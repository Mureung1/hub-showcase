import assert from "node:assert/strict";
import { test } from "vitest";

import { createRecommendationService } from "../backend/services/recommendationService.js";

const request = {
  mode: "quick",
  maxMissingIngredients: 0,
  batchSize: 3,
  batchNumber: 1,
  excludedRecipeFingerprints: [],
  previousRecommendations: [],
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
    description: "삼겹살을 간단하게 조리해 즐기는 든든한 한 끼예요.",
    servings: 1,
    servingStyle: "singleDish",
    cookingTechnique: ["stirFry", "panFry", "stew"][index - 1],
    primaryIngredients: ["삼겹살"],
    components: [],
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
    substitutions: [],
    steps: ["재료를 손질해요.", "팬에서 충분히 익혀요.", "그릇에 담아 완성해요."],
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
        generated: {
          recipes: [1, 2, 3].map(generatedRecipe),
          generationSummary: {
            requestedCount: 3,
            returnedCount: 3,
            stopReason: "targetMet",
          },
        },
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

test("레시피가 세 개보다 적으면 세 번까지 재생성한 뒤 오류를 반환한다", async () => {
  let attempts = 0;
  const service = createRecommendationService({
    supabaseClient: createSupabaseClient(),
    geminiClient: {
      model: "test-model",
      generate: async () => {
        attempts += 1;
        return {
        generated: {
          recipes: [generatedRecipe(1)],
          generationSummary: {
            requestedCount: 3,
            returnedCount: 1,
            stopReason: "qualityLimit",
          },
        },
        metadata: { model: "test-model", durationMs: 10 },
        };
      },
    },
    cacheStore: {
      get: async () => null,
      set: async () => ({
        generated_at: "2026-07-22T06:00:00Z",
        expires_at: "2026-07-22T15:00:00Z",
      }),
    },
    now: () => new Date("2026-07-22T06:00:00Z"),
  });

  await assert.rejects(
    () => service.recommend(request),
    (error) => error.code === "INVALID_RECOMMENDATION",
  );
  assert.equal(attempts, 3);
});

test("정책 위반이 있으면 피드백을 반영해 세 개 전체를 다시 생성한다", async () => {
  let attempts = 0;
  let saved;
  const service = createRecommendationService({
    supabaseClient: createSupabaseClient(),
    geminiClient: {
      model: "test-model",
      generate: async () => {
        attempts += 1;
        return {
          generated: {
            recipes: attempts === 1 ? [
              generatedRecipe(1),
              {
                ...generatedRecipe(2),
                name: "양파 메뉴",
                primaryIngredients: ["양파"],
                requiredIngredients: [{ name: "양파", amount: 1, unit: "개" }],
              },
              generatedRecipe(3),
            ] : [1, 2, 3].map(generatedRecipe),
            generationSummary: {
              requestedCount: 3,
              returnedCount: 3,
              stopReason: "targetMet",
            },
          },
          metadata: { model: "test-model", durationMs: 10 },
        };
      },
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

  assert.equal(attempts, 2);
  assert.deepEqual(result.recipes.map(({ name }) => name), ["삼겹살 메뉴 1", "삼겹살 메뉴 2", "삼겹살 메뉴 3"]);
  assert.equal(result.meta.returnedCount, 3);
  assert.equal(result.meta.stopReason, "targetMet");
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
