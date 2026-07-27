import assert from "node:assert/strict";
import { test } from "vitest";

import { isLiquidIngredient } from "../frontend/src/utils/deductibleIngredients.js";

test("액체 단위를 사용한 재료는 차감 대상에서 제외한다", () => {
  assert.equal(isLiquidIngredient({ name: "토마토주스", unit: "mL" }), true);
  assert.equal(isLiquidIngredient({ name: "조리용 육수", unit: "큰술" }), true);
});

test("표준 g 단위로 생성된 액체류도 이름을 기준으로 차감 대상에서 제외한다", () => {
  assert.equal(isLiquidIngredient({ name: "우유", unit: "g" }), true);
  assert.equal(isLiquidIngredient({ name: "굴소스", unit: "g" }), true);
  assert.equal(isLiquidIngredient({ name: "참기름", unit: "g" }), true);
});

test("고체 재료는 표준 단위에 따라 차감한다", () => {
  assert.equal(isLiquidIngredient({ name: "양파", unit: "개" }), false);
  assert.equal(isLiquidIngredient({ name: "돼지고기", unit: "g" }), false);
  assert.equal(isLiquidIngredient({ name: "두부", unit: "개" }), false);
});
