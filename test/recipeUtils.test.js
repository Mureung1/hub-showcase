import assert from "node:assert/strict";
import test from "node:test";

import { getRecommendedRecipes, scoreRecipe } from "../src/utils/recipeUtils.js";

const ingredients = [
  { id: "egg", name: "계란", category: "egg", tags: ["nutrition:protein"], storedAt: "2099-01-01", shelfLifeDays: 10, expirationType: "relative" },
  { id: "rice", name: "밥", category: "grain", tags: ["nutrition:carb"], expirationType: "longTerm" },
  { id: "onion", name: "양파", category: "vegetable", tags: ["nutrition:vegetable"], expirationType: "longTerm" },
];

const balancedRecipe = {
  id: "balanced",
  requiredIngredients: ["밥", "계란", "양파"],
  cookingTime: 12,
  cookingMethod: "fire",
  effortLevel: "low",
  isSpecial: false,
  isInstant: false,
};

test("보유율과 식품군을 반영해 균형 점수를 계산한다", () => {
  const result = scoreRecipe(balancedRecipe, ingredients, "quick");
  assert.equal(result.scoreBreakdown.availability, 40);
  assert.equal(result.scoreBreakdown.nutrition, 20);
  assert.equal(result.scoreBreakdown.time, 15);
  assert.equal(result.score, 75);
});

test("인스턴트 레시피에 15점 감점을 적용한다", () => {
  const regular = scoreRecipe(balancedRecipe, ingredients, "quick");
  const instant = scoreRecipe({ ...balancedRecipe, id: "instant", isInstant: true }, ingredients, "quick");
  assert.equal(instant.scoreBreakdown.instantPenalty, -15);
  assert.equal(instant.score, regular.score - 15);
});

test("점수, 부족 재료 수, 조리 시간 순으로 정렬한다", () => {
  const slower = { ...balancedRecipe, id: "slower", cookingTime: 15 };
  const faster = { ...balancedRecipe, id: "faster", cookingTime: 10 };
  const results = getRecommendedRecipes({ recipes: [slower, faster], ingredients, selectedMood: "quick" });
  assert.deepEqual(results.map(({ recipe }) => recipe.id), ["faster", "slower"]);
});
