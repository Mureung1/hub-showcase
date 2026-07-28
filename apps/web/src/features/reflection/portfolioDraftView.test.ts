import test from "node:test";
import assert from "node:assert/strict";
import {
  getPortfolioDraftLoadingSteps,
  getPortfolioPdfFileName,
  normalizeDraftListItems,
} from "./portfolioDraftView";

test("normalizes portfolio draft list items for dash-style bullets", () => {
  assert.deepEqual(
    normalizeDraftListItems(["첫 번째 판단", "  ", "두 번째 판단 "]),
    ["첫 번째 판단", "두 번째 판단"],
  );
});

test("provides simple loading steps for portfolio draft generation", () => {
  assert.deepEqual(getPortfolioDraftLoadingSteps(), [
    "Repository 근거 확인",
    "회고와 기술적 도전 연결",
    "포트폴리오 초안 구성",
  ]);
});

test("creates a safe PDF filename from the GitHub owner and repository name", () => {
  assert.equal(
    getPortfolioPdfFileName("SubJeeLee", "my-project"),
    "SubJeeLee_my-project_PtoP",
  );
  assert.equal(
    getPortfolioPdfFileName("team/name", "repo:demo"),
    "team_name_repo_demo_PtoP",
  );
});
