import assert from "node:assert/strict";
import test from "node:test";
import { calculateFreeShippingTarget } from "./freeShippingTarget.js";

test("calculates the minimum whole number of people needed for free shipping", () => {
  assert.equal(calculateFreeShippingTarget({
    unitPrice: 15_000,
    perPersonQuantity: 1,
    freeShippingThreshold: 50_000,
  }), 4);
  assert.equal(calculateFreeShippingTarget({
    unitPrice: 15_000,
    perPersonQuantity: 2,
    freeShippingThreshold: 50_000,
  }), 2);
});
test("returns null when the inputs cannot produce an allowed target", () => {
  const invalidInputs = [
    null,
    {},
    { unitPrice: "15000", perPersonQuantity: 1, freeShippingThreshold: 50_000 },
    { unitPrice: 0, perPersonQuantity: 1, freeShippingThreshold: 50_000 },
    { unitPrice: 15_000, perPersonQuantity: 0, freeShippingThreshold: 50_000 },
    { unitPrice: 15_000, perPersonQuantity: 1, freeShippingThreshold: 0 },
    { unitPrice: 50_000, perPersonQuantity: 1, freeShippingThreshold: 50_000 },
    { unitPrice: 1, perPersonQuantity: 1, freeShippingThreshold: 51 },
  ];

  for (const input of invalidInputs) {
    assert.equal(calculateFreeShippingTarget(input), null);
  }
});
