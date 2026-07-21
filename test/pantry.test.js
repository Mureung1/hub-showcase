import assert from "node:assert/strict";
import test from "node:test";

import { getRecipeAvailability } from "../src/utils/recipeUtils.js";
import { getDefaultPantryAvailability, getPantryItemByName, readPantryAvailability, writePantryAvailability } from "../src/utils/pantry.js";

function createStorage(value = null) {
  return {
    value,
    getItem() { return this.value; },
    setItem(_key, nextValue) { this.value = nextValue; },
  };
}

test("기본 양념 별칭을 같은 보유 항목으로 인식한다", () => {
  assert.equal(getPantryItemByName("진간장").id, "soySauce");
  assert.equal(getPantryItemByName("올리브유").id, "oil");
  assert.equal(getPantryItemByName("다진 마늘").id, "mincedGarlic");
});

test("기본 양념은 처음에 모두 보유 중으로 복구한다", () => {
  assert.deepEqual(readPantryAvailability(createStorage("손상된 값")), getDefaultPantryAvailability());
});

test("없다고 설정한 기본 양념은 부족 재료로 반영한다", () => {
  const storage = createStorage();
  const availability = writePantryAvailability({ ...getDefaultPantryAvailability(), pepper: false }, storage);
  const recipe = { requiredIngredients: ["목살", "소금", "후추"] };
  const result = getRecipeAvailability(recipe, [{ name: "목살" }], availability);

  assert.deepEqual(result.ownedIngredients, ["목살", "소금"]);
  assert.deepEqual(result.missingIngredients, ["후추"]);
});
