import test from "node:test";
import assert from "node:assert/strict";
import {
  getPortfolioDraftLoadingSteps,
  normalizeDraftListItems,
} from "./portfolioDraftView";

test("normalizes portfolio draft list items for dash-style bullets", () => {
  assert.deepEqual(
    normalizeDraftListItems(["첫 번째 판단", "  ", "두 번째 판단 "]),
    ["첫 번째 판단", "두 번째 판단"],
  );
});

test("provides progress steps while the portfolio draft is being generated", () => {
  assert.deepEqual(getPortfolioDraftLoadingSteps(), [
    "Repository 근거 확인",
    "회고와 기술적 도전 연결",
    "포트폴리오 초안 구성",
  ]);
});
