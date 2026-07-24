import assert from "node:assert/strict";
import { test } from "vitest";

import {
  getCoachingTone,
  readMealChoiceHistory,
  recordMealChoice,
} from "../frontend/src/utils/mealChoiceHistory.js";

function createStorage(initialValue = null) {
  let value = initialValue;
  return {
    getItem: () => value,
    setItem: (_key, nextValue) => { value = nextValue; },
  };
}

const now = new Date("2026-07-21T12:00:00.000Z");
const instantEvent = (daysAgo, recipeId = "ramen") => ({
  recipeId,
  selectedAt: new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000).toISOString(),
  isInstant: true,
});

test("손상된 저장값은 빈 이력으로 복구한다", () => {
  assert.deepEqual(readMealChoiceHistory(createStorage("not-json"), now), []);
});

test("최근 선택 횟수에 따라 코칭 강도를 높인다", () => {
  assert.equal(getCoachingTone([], { now, includeCurrentChoice: true }), "gentle");
  assert.equal(getCoachingTone([instantEvent(1)], { now, includeCurrentChoice: true }), "playful");
  assert.equal(getCoachingTone([instantEvent(1), instantEvent(2)], { now, includeCurrentChoice: true }), "direct");
});

test("30일이 지난 이력을 제거하고 새 선택을 기록한다", () => {
  const storage = createStorage(JSON.stringify([instantEvent(31, "old")]));
  const result = recordMealChoice(instantEvent(0, "new"), storage, now);
  assert.deepEqual(result.map(({ recipeId }) => recipeId), ["new"]);
});
