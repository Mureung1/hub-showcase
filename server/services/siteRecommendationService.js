import { getAIConfig } from "./analyzeOpportunity.js";
import { getFriendlyGeminiError } from "./geminiAnalyzeOpportunity.js";
import { geminiExplainSiteRecommendations } from "./geminiExplainSiteRecommendations.js";
import { getActiveSiteRegistry } from "../data/siteRegistry.js";
import { recommendSites } from "./recommendSites.js";

function getFriendlyRecommendationError(error) {
  return getFriendlyGeminiError(error)
    .replaceAll("mock 결과", "규칙 기반 추천 결과")
    .replaceAll("실제 AI 분석", "추천 설명 생성");
}

function applyExplanations(recommendations, explanations) {
  const explanationBySiteId = new Map(
    explanations
      .filter((explanation) => recommendations.some((item) => item.siteId === explanation.siteId))
      .map((explanation) => [explanation.siteId, explanation]),
  );

  return recommendations.map((recommendation) => {
    const explanation = explanationBySiteId.get(recommendation.siteId);
    if (!explanation) return recommendation;

    return {
      ...recommendation,
      ...(explanation.recommendationReason ? { recommendationReason: explanation.recommendationReason } : {}),
      ...(explanation.profileReasons?.length ? { profileReasons: explanation.profileReasons } : {}),
      ...(explanation.complementaryReasons?.length ? { complementaryReasons: explanation.complementaryReasons } : {}),
    };
  });
}

export function createSiteRecommendationService(options = {}) {
  const registry = options.registry ?? getActiveSiteRegistry();
  const getConfig = options.getAIConfig ?? getAIConfig;
  const explain = options.geminiExplainSiteRecommendations ?? geminiExplainSiteRecommendations;

  return {
    async recommend({ profile, trackedSiteIds, desiredInformation, keyword, settings }) {
      const trackedIdSet = new Set(trackedSiteIds);
      const trackedSites = registry.filter((site) => trackedIdSet.has(site.id));
      const baseResult = recommendSites({
        profile,
        trackedSites,
        desiredInformation,
        candidateSites: registry,
        keyword,
        settings,
      });
      const config = getConfig();

      if (!config.liveGeminiEnabled || !baseResult.recommendations.length) {
        return { ...baseResult, mode: "rules", fallbackUsed: false, fallbackReason: null };
      }

      try {
        const explanationResult = await explain({
          profile,
          recommendations: baseResult.recommendations,
          trackedSites,
        });

        return {
          ...baseResult,
          mode: "gemini",
          fallbackUsed: false,
          fallbackReason: null,
          recommendations: applyExplanations(baseResult.recommendations, explanationResult.explanations),
        };
      } catch (error) {
        return {
          ...baseResult,
          mode: "rules",
          fallbackUsed: true,
          fallbackReason: getFriendlyRecommendationError(error),
        };
      }
    },
  };
}

export const siteRecommendationService = createSiteRecommendationService();
