import assert from "node:assert/strict";
import { test } from "vitest";

import { getAllowedStorageOptions, getSuggestedShelfLifeDays, getSuggestedUseByDate } from "../frontend/src/data/shelfLifeRules.js";
import { getDaysRemaining, getExpirationStatus } from "../frontend/src/utils/expiration.js";

test("육류는 냉장 3일과 냉동 7일만 제안한다", () => {
  assert.deepEqual(getAllowedStorageOptions("meat").map(({ id }) => id), ["fridge", "freezer"]);
  assert.equal(getSuggestedShelfLifeDays("meat", "fridge"), 3);
  assert.equal(getSuggestedShelfLifeDays("meat", "freezer"), 7);
  assert.equal(getSuggestedShelfLifeDays("meat", "room"), null);
});

test("장기 보관 카테고리는 실온 90일 확인일을 제안한다", () => {
  for (const category of ["noodle", "canned", "instant", "seasoning"]) {
    assert.deepEqual(getAllowedStorageOptions(category).map(({ id }) => id), ["room"]);
    assert.equal(getSuggestedShelfLifeDays(category, "room"), 90);
  }
});

test("90일 남은 재료는 여유 있는 상태로 표시한다", () => {
  assert.equal(getExpirationStatus(90), "fresh");
});

test("월말과 연말에도 권장 날짜를 올바르게 계산한다", () => {
  assert.equal(getSuggestedUseByDate("meat", "fridge", "2026-12-30"), "2027-01-02");
  assert.equal(getSuggestedUseByDate("vegetable", "fridge", "2028-02-27"), "2028-03-05");
});

test("기준일이 다음 날로 바뀌면 D-day가 하루 감소한다", () => {
  assert.equal(getDaysRemaining("2026-07-25", new Date("2026-07-21T12:00:00")), 4);
  assert.equal(getDaysRemaining("2026-07-25", new Date("2026-07-22T00:00:01")), 3);
});
