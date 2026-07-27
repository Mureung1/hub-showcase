import assert from "node:assert/strict";
import { test } from "vitest";

import {
  buildRecipeConsumptionRows,
  getConsumptionRequestItems,
} from "../frontend/src/utils/recipeConsumption.js";

const recipe = {
  missingIngredients: ["대파"],
  requiredIngredients: [
    { name: "계란", amount: 2, unit: "개" },
    { name: "두부", amount: 0.5, unit: "모" },
    { name: "대파", amount: 1, unit: "대" },
    { name: "간장", amount: 1, unit: "큰술" },
  ],
  optionalIngredients: [
    { name: "김치", amount: 100, unit: "g" },
  ],
};

const ingredients = [
  { id: "egg", name: "계란", quantity: 6, unit: "개", quantityMode: "exact" },
  { id: "tofu", name: "두부", quantity: 1, unit: "모", quantityMode: "exact" },
  { id: "kimchi", name: "김치", quantity: 300, unit: "g", quantityMode: "exact" },
];

test("레시피 필수 재료는 기본 선택하고 부족·기본 양념·선택 재료를 구분한다", () => {
  const rows = buildRecipeConsumptionRows(recipe, ingredients);

  assert.deepEqual(rows.map(({ name, status, selected, optional }) => ({
    name, status, selected, optional,
  })), [
    { name: "계란", status: "ready", selected: true, optional: false },
    { name: "두부", status: "ready", selected: true, optional: false },
    { name: "대파", status: "missing", selected: false, optional: false },
    { name: "김치", status: "ready", selected: false, optional: true },
  ]);
  assert.deepEqual(getConsumptionRequestItems(rows), [
    { id: "egg", amount: 2, unit: "개" },
    { id: "tofu", amount: 0.5, unit: "모" },
  ]);
});

test("단위가 다르거나 보유 수량이 부족하면 자동 차감하지 않는다", () => {
  const rows = buildRecipeConsumptionRows({
    missingIngredients: [],
    requiredIngredients: [
      { name: "계란", amount: 7, unit: "개" },
      { name: "두부", amount: 500, unit: "g" },
    ],
    optionalIngredients: [],
  }, ingredients);

  assert.deepEqual(rows.map(({ status, selected }) => ({ status, selected })), [
    { status: "insufficient", selected: false },
    { status: "unitMismatch", selected: false },
  ]);
});
