import assert from "node:assert/strict";
import test from "node:test";

import {
  buildIngredientContext,
  createInventorySignature,
  createRecipeFingerprint,
  getNextKstMidnight,
  normalizeIngredientName,
  RecommendationPolicyError,
  validateGeneratedRecipes,
} from "../server/services/recommendationPolicy.js";

const rows = [
  {
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
  },
  {
    name: "상한 두부",
    category: "tofu",
    subcategory: null,
    tags: ["nutrition:protein"],
    quantity: 1,
    unit: "모",
    quantity_mode: "exact",
    storage: "fridge",
    expiration_type: "absolute",
    expiration_date: "2026-07-21",
    shelf_life_days: null,
    stored_at: "2026-07-18",
    is_staple: false,
    is_instant: false,
    is_prepared: false,
  },
];

function recipe(values = {}) {
  return {
    name: "삼겹살 볶음",
    servings: 1,
    requiredIngredients: [{ name: "삼겹살", amount: 200, unit: "g" }],
    optionalIngredients: [],
    cookingTime: 15,
    difficulty: "easy",
    cookingMethod: "fire",
    dishType: "stirFry",
    effortLevel: "low",
    recommendationReasons: ["보유 재료를 활용해요."],
    nutritionTags: ["nutrition:protein"],
    nutritionSummary: "단백질 중심 메뉴",
    steps: ["재료를 손질해요.", "충분히 익혀요."],
    safetyNotes: [],
    ...values,
  };
}

test("업무 필드만 변환하고 소비기한이 지난 재료를 제외한다", () => {
  const context = buildIngredientContext(rows, { today: "2026-07-22" });

  assert.equal(context.availableIngredients.length, 1);
  assert.equal(context.availableIngredients[0].name, "삼겹살");
  assert.equal(context.availableIngredients[0].daysRemaining, 2);
  assert.equal("id" in context.availableIngredients[0], false);
  assert.equal(context.excludedExpiredIngredients[0].name, "상한 두부");
});

test("재료 별칭과 공백을 같은 이름으로 정규화한다", () => {
  assert.equal(normalizeIngredientName(" 달걀 "), normalizeIngredientName("계란"));
  assert.equal(normalizeIngredientName("돼지고기 목살"), normalizeIngredientName("목살"));
});

test("재료 순서와 관계없이 같은 재고 signature를 만든다", () => {
  const context = buildIngredientContext(rows, { today: "2026-07-22" });
  assert.equal(
    createInventorySignature(context.availableIngredients),
    createInventorySignature([...context.availableIngredients].reverse()),
  );
});

test("레시피명, 필수 재료, 메뉴 형태로 fingerprint를 만든다", () => {
  assert.equal(createRecipeFingerprint(recipe()), createRecipeFingerprint(recipe()));
  assert.notEqual(createRecipeFingerprint(recipe()), createRecipeFingerprint(recipe({ dishType: "riceBowl" })));
});

test("부족 재료 수와 메뉴 형태 중복을 서버 정책으로 차단한다", () => {
  const context = buildIngredientContext(rows, { today: "2026-07-22" });
  const generated = {
    recipes: [
      recipe(),
      recipe({ name: "다른 볶음", requiredIngredients: [{ name: "양파", amount: 1, unit: "개" }] }),
      recipe({ name: "세 번째 볶음" }),
    ],
  };

  assert.throws(
    () => validateGeneratedRecipes(generated, {
      mode: "quick",
      maxMissingIngredients: 0,
      excludedRecipeFingerprints: [],
    }, context),
    (error) => error instanceof RecommendationPolicyError
      && error.status === 502
      && error.retryable === true,
  );
});

test("재료 중복은 허용하고 서로 다른 메뉴 형태는 통과시킨다", () => {
  const context = buildIngredientContext(rows, { today: "2026-07-22" });
  const generated = {
    recipes: [
      recipe(),
      recipe({ name: "삼겹살 덮밥", dishType: "riceBowl" }),
      recipe({ name: "삼겹살 국수", dishType: "noodle" }),
    ],
  };
  const recipes = validateGeneratedRecipes(generated, {
    mode: "quick",
    maxMissingIngredients: 0,
    excludedRecipeFingerprints: [],
  }, context);

  assert.equal(recipes.length, 3);
  assert.ok(recipes.every((item) => item.requiredIngredients[0].name === "삼겹살"));
  assert.ok(recipes.every((item) => /^[a-f0-9]{64}$/.test(item.fingerprint)));
});

test("한국 시간 기준 다음 자정을 UTC 시각으로 계산한다", () => {
  const expiresAt = getNextKstMidnight(new Date("2026-07-22T06:00:00Z"));
  assert.equal(expiresAt.toISOString(), "2026-07-22T15:00:00.000Z");
});
