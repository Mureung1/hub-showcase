import assert from "node:assert/strict";
import { test } from "vitest";

import { getRecipeNaggingMessage } from "../frontend/src/utils/naggingUtils.js";

const ingredients = [
  { id: "ingredient-egg", name: "계란", tags: ["nutrition:protein"] },
  { id: "ingredient-onion", name: "양파", tags: ["nutrition:vegetable"] },
];

test("인스턴트와 가공식품을 함께 쓰는 레시피에 코칭 메시지를 만든다", () => {
  const message = getRecipeNaggingMessage({
    recipe: {
      id: "recipe-spam-ramen",
      requiredIngredients: [{ name: "라면" }, { name: "스팸" }, { name: "김치" }],
    },
    ingredients,
  });

  assert.equal(message.triggerType, "instantSelected");
  assert.deepEqual(message.suggestedIngredients.map(({ name }) => name), ["양파", "계란"]);
});

test("인스턴트 또는 가공식품만 단독으로 쓰는 레시피에는 코칭하지 않는다", () => {
  assert.equal(getRecipeNaggingMessage({
    recipe: {
      id: "recipe-ramen",
      requiredIngredients: [{ name: "라면" }, { name: "대파" }],
    },
    ingredients,
  }), null);
});
