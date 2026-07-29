import assert from "node:assert/strict";
import { test } from "vitest";

import {
  convertQuantityToStandard,
  convertStandardQuantityToUnit,
} from "../shared/quantityUnits.js";

test("기존 개수 단위를 개로 통일한다", () => {
  assert.deepEqual(convertQuantityToStandard(2, "대"), {
    quantity: 2,
    unit: "개",
    factor: 1,
  });
});

test("기존 포장 단위를 개로 통일한다", () => {
  assert.deepEqual(convertQuantityToStandard(1, "모"), {
    quantity: 1,
    unit: "개",
    factor: 1,
  });
  assert.deepEqual(convertQuantityToStandard(1, "캔"), {
    quantity: 1,
    unit: "개",
    factor: 1,
  });
});

test("기존 무게 단위를 g으로 환산하고 원래 단위로 되돌린다", () => {
  assert.deepEqual(convertQuantityToStandard(1.5, "kg"), {
    quantity: 1500,
    unit: "g",
    factor: 1000,
  });
  assert.equal(convertStandardQuantityToUnit(800, "kg"), 0.8);
});

test("알 수 없는 단위는 임의로 환산하지 않는다", () => {
  assert.equal(convertQuantityToStandard(1, "인분"), null);
});
