import assert from "node:assert/strict";
import test from "node:test";

import { filterAnalysesBySettings } from "../src/services/filterAnalysesBySettings.js";

const settings = {
  recommendationCategories: ["contest"],
  minimumMatchScore: 70,
  includeUnknownDeadline: false,
};

test("저장 공고는 카테고리·점수·마감일 설정으로 기본 필터링된다", () => {
  const items = [
    { id: "keep", opportunity: { category: "contest", deadline: "2026-08-31" }, match: { score: 80 } },
    { id: "low-score", opportunity: { category: "contest", deadline: "2026-08-31" }, match: { score: 60 } },
    { id: "unknown-deadline", opportunity: { category: "contest", deadline: null }, match: { score: 80 } },
    { id: "wrong-category", opportunity: { category: "scholarship", deadline: "2026-08-31" }, match: { score: 90 } },
  ];

  assert.deepEqual(filterAnalysesBySettings(items, settings).map((item) => item.id), ["keep"]);
});