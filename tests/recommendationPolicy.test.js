import assert from "node:assert/strict";
import { test } from "vitest";

import {
  buildIngredientContext,
  createInventorySignature,
  createRecipeFingerprint,
  getNextKstMidnight,
  normalizeIngredientName,
  RecommendationPolicyError,
  validateGeneratedRecipes,
} from "../backend/services/recommendationPolicy.js";

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
    description: "삼겹살을 빠르게 볶아 만드는 든든한 한 끼예요.",
    servings: 1,
    servingStyle: "singleDish",
    cookingTechnique: "stirFry",
    primaryIngredients: ["삼겹살"],
    components: [],
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
    substitutions: [],
    steps: ["재료를 손질해요.", "팬에서 충분히 익혀요.", "그릇에 담아 완성해요."],
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
      recipe({
        name: "다른 볶음",
        cookingTechnique: "panFry",
        primaryIngredients: ["양파"],
        requiredIngredients: [{ name: "양파", amount: 1, unit: "개" }],
      }),
      recipe({ name: "세 번째 볶음" }),
    ],
  };

  assert.throws(
    () => validateGeneratedRecipes(generated, {
      mode: "quick",
      maxMissingIngredients: 0,
      batchNumber: 1,
      excludedRecipeFingerprints: [],
    }, context),
    (error) => error instanceof RecommendationPolicyError
      && error.status === 502
      && error.retryable === true,
  );
});

test("부분 허용 모드에서는 정책을 통과한 메뉴만 반환한다", () => {
  const context = buildIngredientContext(rows, { today: "2026-07-22" });
  const generated = {
    recipes: [
      recipe(),
      recipe({
        name: "재료가 부족한 볶음",
        primaryIngredients: ["양파"],
        requiredIngredients: [{ name: "양파", amount: 1, unit: "개" }],
      }),
      recipe({
        name: "삼겹살 찌개",
        dishType: "stew",
        cookingTechnique: "stew",
      }),
    ],
  };

  const recipes = validateGeneratedRecipes(generated, {
    mode: "quick",
    maxMissingIngredients: 0,
    batchNumber: 1,
    excludedRecipeFingerprints: [],
  }, context, { allowPartial: true });

  assert.deepEqual(recipes.map(({ name }) => name), ["삼겹살 볶음", "삼겹살 찌개"]);
});

test("재료 중복은 허용하고 서로 다른 메뉴 형태는 통과시킨다", () => {
  const context = buildIngredientContext(rows, { today: "2026-07-22" });
  const generated = {
    recipes: [
      recipe(),
      recipe({ name: "삼겹살 덮밥", dishType: "riceBowl", cookingTechnique: "panFry" }),
      recipe({ name: "삼겹살 국수", dishType: "noodle", cookingTechnique: "boil" }),
    ],
  };
  const recipes = validateGeneratedRecipes(generated, {
    mode: "quick",
    maxMissingIngredients: 0,
    batchNumber: 1,
    excludedRecipeFingerprints: [],
  }, context);

  assert.equal(recipes.length, 3);
  assert.ok(recipes.every((item) => item.requiredIngredients[0].name === "삼겹살"));
  assert.ok(recipes.every((item) => /^[a-f0-9]{64}$/.test(item.fingerprint)));
});

test("기본 양념과 조리된 밥은 부족 재료로 계산하지 않고 그 외 재료는 최대 두 개까지 허용한다", () => {
  const context = buildIngredientContext(rows, { today: "2026-07-22" });
  const generated = {
    recipes: [recipe({
      name: "삼겹살 한 상",
      servingStyle: "mealSet",
      dishType: "mealSet",
      cookingTechnique: "grill",
      primaryIngredients: ["삼겹살"],
      components: [
        { name: "밥", role: "staple", ingredientNames: ["밥"] },
        { name: "삼겹살구이", role: "main", ingredientNames: ["삼겹살", "양파"] },
        { name: "김치", role: "side", ingredientNames: ["김치"] },
      ],
      requiredIngredients: [
        { name: "밥", amount: 1, unit: "공기" },
        { name: "삼겹살", amount: 200, unit: "g" },
        { name: "양파", amount: 0.5, unit: "개" },
        { name: "김치", amount: 50, unit: "g" },
      ],
    })],
  };

  const recipes = validateGeneratedRecipes(generated, {
    mode: "quick",
    maxMissingIngredients: 2,
    batchNumber: 1,
    excludedRecipeFingerprints: [],
  }, context);

  assert.deepEqual(recipes[0].missingIngredients, ["양파", "김치"]);
});

test("소비기한 당일 재료에는 상태 확인 안내만 추가한다", () => {
  const dDayRows = [{ ...rows[0], expiration_date: "2026-07-22" }];
  const context = buildIngredientContext(dDayRows, { today: "2026-07-22" });
  const generated = { recipes: [recipe()] };

  const recipes = validateGeneratedRecipes(generated, {
    mode: "quick",
    maxMissingIngredients: 0,
    batchNumber: 1,
    excludedRecipeFingerprints: [],
  }, context);

  assert.match(recipes[0].safetyNotes[0], /상태를 확인/);
  assert.doesNotMatch(recipes[0].safetyNotes[0], /충분히 익혀/);
});

test("보유 수량보다 많이 요구하면 같은 재료도 부족 재료로 계산한다", () => {
  const context = buildIngredientContext(rows, { today: "2026-07-22" });
  const generated = {
    recipes: [recipe({
      requiredIngredients: [{ name: "삼겹살", amount: 600, unit: "g" }],
    })],
  };

  const recipes = validateGeneratedRecipes(generated, {
    mode: "quick",
    maxMissingIngredients: 1,
    batchNumber: 1,
    excludedRecipeFingerprints: [],
  }, context);

  assert.deepEqual(recipes[0].missingIngredients, ["삼겹살"]);
});

test("일반 추천에서는 소비기한 우선 재료를 강제로 사용하지 않는다", () => {
  const context = buildIngredientContext(rows, { today: "2026-07-22" });
  const generated = {
    recipes: [recipe({
      name: "삼겹살 양파볶음",
      primaryIngredients: ["양파"],
      requiredIngredients: [
        { name: "삼겹살", amount: 150, unit: "g" },
        { name: "양파", amount: 1, unit: "개" },
      ],
    })],
  };

  const recipes = validateGeneratedRecipes(generated, {
    mode: "quick",
    maxMissingIngredients: 1,
    batchNumber: 1,
    excludedRecipeFingerprints: [],
  }, context);

  assert.equal(recipes[0].name, "삼겹살 양파볶음");
});

test("부족 재료를 허용해도 보유 재료를 전혀 쓰지 않는 메뉴는 거부한다", () => {
  const context = buildIngredientContext(rows, { today: "2026-07-22" });
  const generated = {
    recipes: [recipe({
      name: "양파볶음",
      primaryIngredients: ["양파"],
      requiredIngredients: [{ name: "양파", amount: 1, unit: "개" }],
    })],
  };

  assert.throws(
    () => validateGeneratedRecipes(generated, {
      mode: "quick",
      maxMissingIngredients: 1,
      batchNumber: 1,
      excludedRecipeFingerprints: [],
    }, context),
    (error) => error instanceof RecommendationPolicyError
      && error.violations.some((violation) => violation.startsWith("INVENTORY_INGREDIENT_REQUIRED")),
  );
});

test("추가 추천은 이전 메뉴와 조리 형태·기법·주재료 중 두 가지 이상 달라야 한다", () => {
  const context = buildIngredientContext(rows, { today: "2026-07-22" });
  const previous = recipe();
  const generated = {
    recipes: [recipe({
      name: "삼겹살 매콤볶음",
      dishType: "riceBowl",
    })],
  };

  assert.throws(
    () => validateGeneratedRecipes(generated, {
      mode: "quick",
      maxMissingIngredients: 0,
      batchNumber: 2,
      excludedRecipeFingerprints: [createRecipeFingerprint(previous)],
      previousRecommendations: [{
        fingerprint: createRecipeFingerprint(previous),
        name: previous.name,
        servingStyle: previous.servingStyle,
        cookingTechnique: previous.cookingTechnique,
        dishType: previous.dishType,
        primaryIngredients: previous.primaryIngredients,
      }],
    }, context),
    (error) => error instanceof RecommendationPolicyError
      && error.violations.some((violation) => violation.startsWith("PREVIOUS_RECOMMENDATION_TOO_SIMILAR")),
  );
});

test("인스턴트와 가공식품 조합에는 균형 보완 필수 재료가 필요하다", () => {
  const context = buildIngredientContext([
    {
      ...rows[0],
      name: "라면",
      category: "instant",
      tags: ["nutrition:carb", "processing:instant"],
      quantity: 1,
      unit: "개",
    },
    {
      ...rows[0],
      name: "스팸",
      category: "canned",
      tags: ["nutrition:protein", "processing:processed"],
      quantity: 1,
      unit: "캔",
    },
  ], { today: "2026-07-22" });
  const request = {
    mode: "quick",
    maxMissingIngredients: 1,
    batchNumber: 1,
    excludedRecipeFingerprints: [],
  };
  const unbalanced = {
    recipes: [recipe({
      name: "스팸 라면",
      primaryIngredients: ["라면", "스팸"],
      requiredIngredients: [
        { name: "라면", amount: 1, unit: "개" },
        { name: "스팸", amount: 0.5, unit: "캔" },
      ],
    })],
  };

  assert.throws(
    () => validateGeneratedRecipes(unbalanced, request, context),
    (error) => error instanceof RecommendationPolicyError
      && error.violations.some((violation) => violation.startsWith("PROCESSING_BALANCE_REQUIRED")),
  );

  const balanced = {
    recipes: [recipe({
      name: "계란 스팸 라면",
      primaryIngredients: ["라면", "스팸"],
      requiredIngredients: [
        { name: "라면", amount: 1, unit: "개" },
        { name: "스팸", amount: 0.5, unit: "캔" },
        { name: "계란", amount: 1, unit: "개" },
      ],
    })],
  };
  const recipes = validateGeneratedRecipes(balanced, request, context);

  assert.deepEqual(recipes[0].missingIngredients, ["계란"]);
});

test("한국 시간 기준 다음 자정을 UTC 시각으로 계산한다", () => {
  const expiresAt = getNextKstMidnight(new Date("2026-07-22T06:00:00Z"));
  assert.equal(expiresAt.toISOString(), "2026-07-22T15:00:00.000Z");
});
