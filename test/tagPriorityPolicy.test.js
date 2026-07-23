import assert from "node:assert/strict";
import { test } from "vitest";

import {
  buildIngredientContext,
  createInventorySignature,
} from "../server/services/recommendationPolicy.js";

const TODAY = "2026-07-22";

function ingredient({
  name = "테스트 재료",
  expirationDate = null,
  tags = [],
} = {}) {
  return {
    name,
    category: "vegetable",
    subcategory: null,
    tags,
    quantity: 1,
    unit: "개",
    quantity_mode: "exact",
    storage: "fridge",
    expiration_type: expirationDate ? "absolute" : "longTerm",
    expiration_date: expirationDate,
    shelf_life_days: null,
    stored_at: TODAY,
    is_staple: false,
    is_instant: false,
    is_prepared: false,
  };
}

function priorityScore(values) {
  return buildIngredientContext([ingredient(values)], { today: TODAY })
    .availableIngredients[0]?.priorityScore;
}

test("nutrition bonus is +5 per distinct tag and capped at +10", () => {
  assert.equal(priorityScore({ tags: ["nutrition:protein"] }), 5);
  assert.equal(priorityScore({
    tags: ["nutrition:protein", "nutrition:vegetable"],
  }), 10);
  assert.equal(priorityScore({
    tags: [
      "nutrition:protein",
      "nutrition:vegetable",
      "nutrition:carb",
      "nutrition:fat",
    ],
  }), 10);
  assert.equal(priorityScore({
    tags: ["nutrition:protein", "nutrition:protein"],
  }), 5);
});

test("processing penalty uses only the larger instant penalty", () => {
  assert.equal(priorityScore({ tags: ["processing:processed"] }), 0);
  assert.equal(priorityScore({
    expirationDate: "2026-07-30",
    tags: ["processing:processed"],
  }), 5);
  assert.equal(priorityScore({
    expirationDate: "2026-07-30",
    tags: ["processing:instant"],
  }), 0);
  assert.equal(priorityScore({
    expirationDate: "2026-07-30",
    tags: ["processing:processed", "processing:instant"],
  }), 0);
});

test("expiration score matches every policy boundary", () => {
  const cases = [
    ["2026-07-22", 60],
    ["2026-07-23", 50],
    ["2026-07-24", 50],
    ["2026-07-25", 35],
    ["2026-07-27", 35],
    ["2026-07-28", 20],
    ["2026-07-29", 20],
    ["2026-07-30", 10],
    ["2026-08-21", 10],
    ["2026-08-22", 0],
    [null, 0],
  ];

  for (const [expirationDate, expected] of cases) {
    assert.equal(
      priorityScore({ expirationDate }),
      expected,
      `unexpected score for ${expirationDate ?? "no date"}`,
    );
  }
});

test("priority score stays in range and is deterministic", () => {
  const values = {
    expirationDate: "2026-07-22",
    tags: [
      "nutrition:protein",
      "nutrition:vegetable",
      "nutrition:carb",
      "nutrition:fat",
    ],
  };
  const first = priorityScore(values);
  const second = priorityScore(values);

  assert.equal(first, 70);
  assert.equal(second, first);
  assert.ok(first >= 0 && first <= 100);
  assert.equal(priorityScore({ tags: ["processing:instant"] }), 0);
});

test("ties are ordered by remaining days and then Korean ingredient name", () => {
  const context = buildIngredientContext([
    ingredient({ name: "당근", expirationDate: "2026-08-22", tags: ["nutrition:vegetable"] }),
    ingredient({ name: "감자", expirationDate: "2026-08-22", tags: ["nutrition:vegetable"] }),
    ingredient({ name: "양파", expirationDate: "2026-08-21" }),
  ], { today: TODAY });

  assert.deepEqual(
    context.availableIngredients.map(({ name }) => name),
    ["양파", "감자", "당근"],
  );
});

test("expired ingredients are excluded from Gemini ingredient context", () => {
  const context = buildIngredientContext([
    ingredient({ name: "만료 두부", expirationDate: "2026-07-21", tags: ["nutrition:protein"] }),
    ingredient({ name: "사용 가능 두부", expirationDate: "2026-07-22", tags: ["nutrition:protein"] }),
  ], { today: TODAY });

  assert.deepEqual(context.availableIngredients.map(({ name }) => name), ["사용 가능 두부"]);
  assert.deepEqual(context.excludedExpiredIngredients.map(({ name }) => name), ["만료 두부"]);
});

test("changing tags changes the inventory signature", () => {
  const withoutTags = buildIngredientContext([
    ingredient({ tags: [] }),
  ], { today: TODAY }).availableIngredients;
  const withTags = buildIngredientContext([
    ingredient({ tags: ["nutrition:vegetable"] }),
  ], { today: TODAY }).availableIngredients;

  assert.notEqual(
    createInventorySignature(withoutTags),
    createInventorySignature(withTags),
  );
});
