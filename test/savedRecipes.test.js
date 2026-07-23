import assert from "node:assert/strict";
import { test } from "vitest";

import {
  createShoppingSearchUrl,
  isRecipeSaved,
  readSavedRecipes,
  toggleSavedRecipe,
} from "../src/utils/savedRecipes.js";

function createStorage() {
  const values = new Map();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
  };
}

const recipe = {
  id: "recipe-123",
  fingerprint: "a".repeat(64),
  name: "두부 덮밥",
  requiredIngredients: [{ name: "두부", amount: 1, unit: "모" }],
  missingIngredients: [],
  substitutions: [],
};

test("레시피 스냅샷을 저장하고 다시 읽는다", () => {
  const storage = createStorage();
  const result = toggleSavedRecipe(recipe, storage);

  assert.equal(result.saved, true);
  assert.equal(result.persisted, true);
  assert.equal(result.recipes[0].id, undefined);
  assert.equal(result.recipes[0].name, "두부 덮밥");
  assert.equal(isRecipeSaved(recipe, readSavedRecipes(storage)), true);
});

test("저장된 레시피를 다시 누르면 저장을 해제한다", () => {
  const storage = createStorage();
  toggleSavedRecipe(recipe, storage);
  const result = toggleSavedRecipe(recipe, storage);

  assert.equal(result.saved, false);
  assert.deepEqual(readSavedRecipes(storage), []);
});

test("구매 링크는 재료명으로 네이버 쇼핑 검색을 연다", () => {
  assert.equal(
    createShoppingSearchUrl("대파 1단"),
    "https://search.shopping.naver.com/search/all?query=%EB%8C%80%ED%8C%8C%201%EB%8B%A8",
  );
});
