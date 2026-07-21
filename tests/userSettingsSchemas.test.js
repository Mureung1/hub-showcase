import assert from "node:assert/strict";
import test from "node:test";

import { userSettingsRequestSchema } from "../server/schemas/userSettingsSchemas.js";

const validSettings = {
  recommendationCategories: ["contest", "research", "contest"],
  preferredRegions: ["대구", "온라인", "대구"],
  includeOnline: true,
  minimumMatchScore: 65,
  includeUnknownDeadline: false,
  autoSaveAnalyzedOpportunities: true,
  recommendationLimit: 8,
};

test("개인 설정 입력은 중복을 제거하고 소유자 식별자를 무시한다", () => {
  const result = userSettingsRequestSchema.parse({ ...validSettings, userId: "another-account" });

  assert.deepEqual(result.recommendationCategories, ["contest", "research"]);
  assert.deepEqual(result.preferredRegions, ["대구", "온라인"]);
  assert.equal(Object.hasOwn(result, "userId"), false);
});

test("허용하지 않은 카테고리와 범위를 벗어난 값은 거부한다", () => {
  assert.equal(userSettingsRequestSchema.safeParse({
    ...validSettings,
    recommendationCategories: ["unknown"],
  }).success, false);
  assert.equal(userSettingsRequestSchema.safeParse({
    ...validSettings,
    minimumMatchScore: 101,
  }).success, false);
  assert.equal(userSettingsRequestSchema.safeParse({
    ...validSettings,
    recommendationLimit: 0,
  }).success, false);
});