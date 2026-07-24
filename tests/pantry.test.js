import assert from "node:assert/strict";
import { test } from "vitest";

import { getPantryItemByName, isPantryIngredientName } from "../frontend/src/utils/pantry.js";

test("기본 양념 별칭을 같은 보유 항목으로 인식한다", () => {
  assert.equal(getPantryItemByName("진간장").id, "soySauce");
  assert.equal(getPantryItemByName("올리브유").id, "oil");
  assert.equal(getPantryItemByName("다진 마늘").id, "mincedGarlic");
});

test("기본 양념은 냉장고 재료 목록에서 분리한다", () => {
  assert.equal(isPantryIngredientName("소금"), true);
  assert.equal(isPantryIngredientName("삼겹살"), false);
});
