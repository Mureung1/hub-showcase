import assert from "node:assert/strict";
import test from "node:test";

import { siteRegistry } from "../server/data/siteRegistry.js";
import { recommendSites } from "../server/services/recommendSites.js";
import { createSiteRecommendationService } from "../server/services/siteRecommendationService.js";

const profile = {
  school: "경북대학교",
  grade: 2,
  majors: ["컴퓨터학부", "수학"],
  interests: ["AI", "소프트웨어", "공모전"],
  regions: ["대구", "온라인"],
  canJoinTeam: true,
};
const trackedSiteIds = ["university-general-notices", "department-notices"];

function getTrackedSites() {
  return siteRegistry.filter((site) => trackedSiteIds.includes(site.id));
}

test("등록된 사이트만 사용하고 저장된 출처와 같은 사이트는 다시 추천하지 않는다", () => {
  const result = recommendSites({
    profile,
    trackedSites: getTrackedSites(),
    desiredInformation: ["scholarship", "contest", "research", "internship"],
    candidateSites: siteRegistry,
  });

  const recommendedIds = result.recommendations.map((item) => item.siteId);

  assert.equal(recommendedIds.includes("university-general-notices"), false);
  assert.equal(recommendedIds.includes("department-notices"), false);
  assert.equal(recommendedIds.includes("work24"), true);
  assert.equal(recommendedIds.every((siteId) => siteRegistry.some((site) => site.id === siteId)), true);
  assert.equal(new Set(result.recommendations.map((item) => item.url)).size, result.recommendations.length);
  assert.equal(result.coverage.missingCoverage.includes("internship"), true);
});

test("추천 점수와 이유는 결정적이며 공백 보완 정보를 포함한다", () => {
  const input = {
    profile,
    trackedSites: getTrackedSites(),
    desiredInformation: ["internship", "research"],
    candidateSites: siteRegistry,
  };
  const first = recommendSites(input);
  const second = recommendSites(input);

  assert.deepEqual(first, second);
  assert.equal(first.recommendations.every((item) => item.score >= 0 && item.score <= 100), true);
  assert.equal(first.recommendations.every((item) => item.recommendationReason.length > 0), true);
  assert.equal(first.recommendations.some((item) => item.missingCoverageFilled.includes("internship")), true);
  assert.equal(first.recommendations.some((item) => item.siteId === "nrf"), true);
});

test("모든 등록 사이트가 저장된 출처이면 추천 결과가 비어 있다", () => {
  const result = recommendSites({
    profile,
    trackedSites: siteRegistry,
    desiredInformation: ["scholarship"],
    candidateSites: siteRegistry,
  });

  assert.deepEqual(result.recommendations, []);
});

test("Gemini 설명 생성이 실패해도 규칙 기반 추천을 반환한다", async () => {
  const service = createSiteRecommendationService({
    registry: siteRegistry,
    getAIConfig: () => ({ liveGeminiEnabled: true }),
    geminiExplainSiteRecommendations: async () => {
      throw new Error("network unavailable");
    },
  });
  const result = await service.recommend({
    profile,
    trackedSiteIds,
    desiredInformation: ["internship"],
    keyword: null,
  });

  assert.equal(result.mode, "rules");
  assert.equal(result.fallbackUsed, true);
  assert.equal(result.recommendations.length > 0, true);
  assert.equal(result.recommendations.every((item) => siteRegistry.some((site) => site.id === item.siteId && site.url === item.url)), true);
});
