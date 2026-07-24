import { deriveLegacyFaceSignal } from "./mapBlendshapesToFaceSignal";

function normalizeOptions(options = {}) {
  return {
    windowSize:
      Number.isInteger(options.windowSize) && options.windowSize > 0
        ? options.windowSize
        : 5,
    minSamples:
      Number.isInteger(options.minSamples) && options.minSamples > 0
        ? options.minSamples
        : 3,
    minFeatureScore: Number.isFinite(options.minFeatureScore)
      ? Math.min(1, Math.max(0, options.minFeatureScore))
      : 0.1
  };
}

function roundScore(value) {
  return Math.round(value * 100) / 100;
}

export function stabilizeFaceSignal(results, options) {
  if (!Array.isArray(results) || results.length === 0) return null;

  const { windowSize, minSamples, minFeatureScore } = normalizeOptions(options);
  const recentResults = results
    .slice(-windowSize)
    .filter((result) => result && Array.isArray(result.features));

  if (recentResults.length < minSamples) return null;

  const featureTotals = new Map();

  recentResults.forEach((result) => {
    result.features.forEach((feature) => {
      if (
        typeof feature?.name === "string" &&
        Number.isFinite(feature.score) &&
        feature.score >= 0 &&
        feature.score <= 1
      ) {
        featureTotals.set(
          feature.name,
          (featureTotals.get(feature.name) || 0) + feature.score
        );
      }
    });
  });

  const features = [...featureTotals.entries()]
    .map(([name, total]) => ({
      name,
      score: roundScore(total / recentResults.length)
    }))
    .filter((feature) => feature.score >= minFeatureScore)
    .sort((left, right) => right.score - left.score)
    .slice(0, 6);
  const legacy = deriveLegacyFaceSignal(features);

  return {
    features,
    legacySignal: legacy.signal,
    confidence: features[0]?.score || 0,
    evidence: legacy.evidence
  };
}
