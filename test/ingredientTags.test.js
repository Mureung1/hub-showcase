import assert from "node:assert/strict";
import test from "node:test";

import {
  getDefaultIngredientTags,
  getIngredientTags,
  sanitizeIngredientTags,
} from "../shared/ingredientTags.js";

test("카테고리에 맞는 기본 태그를 제안한다", () => {
  assert.deepEqual(getDefaultIngredientTags("instant"), ["nutrition:carb", "processing:instant"]);
  assert.deepEqual(getDefaultIngredientTags("vegetable"), ["nutrition:vegetable"]);
});

test("허용하지 않은 태그와 중복 태그를 제거한다", () => {
  assert.deepEqual(
    sanitizeIngredientTags(["nutrition:protein", "custom", "nutrition:protein"]),
    ["nutrition:protein"],
  );
});

test("사용자가 태그를 모두 해제한 선택을 유지한다", () => {
  assert.deepEqual(getIngredientTags({ category: "egg", tags: [] }), []);
  assert.deepEqual(getIngredientTags({ category: "egg" }), ["nutrition:protein"]);
});
