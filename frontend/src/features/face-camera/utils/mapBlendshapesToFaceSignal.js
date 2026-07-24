const SIGNAL_THRESHOLD = 0.45;

const FEATURE_GROUPS = {
  smile: ["mouthSmileLeft", "mouthSmileRight"],
  tense: ["browDownLeft", "browDownRight", "eyeSquintLeft", "eyeSquintRight"],
  downcast: ["mouthFrownLeft", "mouthFrownRight", "browInnerUp"],
  angry: [
    "browDownLeft",
    "browDownRight",
    "eyeSquintLeft",
    "eyeSquintRight",
    "mouthPressLeft",
    "mouthPressRight"
  ]
};

function clampScore(value) {
  const score = Number(value);
  if (!Number.isFinite(score)) return 0;
  return Math.min(1, Math.max(0, score));
}

function average(...values) {
  return values.reduce((total, value) => total + value, 0) / values.length;
}

function toScoreMap(input) {
  if (Array.isArray(input)) {
    return input.reduce((scores, category) => {
      const name = category?.categoryName || category?.displayName;
      if (typeof name === "string" && name) {
        scores[name] = clampScore(category.score);
      }
      return scores;
    }, {});
  }

  if (!input || typeof input !== "object") return {};

  return Object.entries(input).reduce((scores, [name, value]) => {
    scores[name] = clampScore(value);
    return scores;
  }, {});
}

function read(scores, name) {
  return scores[name] || 0;
}

function collectEvidence(signal, scores) {
  return (FEATURE_GROUPS[signal] || [])
    .map((name) => ({ name, score: read(scores, name) }))
    .filter((item) => item.score >= 0.35)
    .sort((left, right) => right.score - left.score)
    .slice(0, 3)
    .map((item) => item.name);
}

function roundScore(value) {
  return Math.round(clampScore(value) * 100) / 100;
}

function collectFeatures(scores) {
  return Object.entries(scores)
    .filter(([name, score]) => name !== "_neutral" && score >= 0.1)
    .map(([name, score]) => ({ name, score: roundScore(score) }))
    .sort((left, right) => right.score - left.score)
    .slice(0, 6);
}

/**
 * Prototype heuristic only. Blendshape similarity is not a diagnosis or a
 * scientifically validated probability of the user's internal emotion.
 */
export function mapBlendshapesToFaceSignal(input) {
  const scores = toScoreMap(input);
  const features = collectFeatures(scores);
  const legacy = deriveLegacyFaceSignal(scores);

  return {
    features,
    legacySignal: legacy.signal,
    confidence: legacy.confidence,
    evidence: legacy.evidence
  };
}

export function deriveLegacyFaceSignal(input) {
  const scores = Array.isArray(input)
    ? input.reduce((result, feature) => {
        if (typeof feature?.name === "string") {
          result[feature.name] = clampScore(feature.score);
        }
        return result;
      }, {})
    : toScoreMap(input);
  const browDown = average(read(scores, "browDownLeft"), read(scores, "browDownRight"));
  const eyeSquint = average(read(scores, "eyeSquintLeft"), read(scores, "eyeSquintRight"));
  const mouthSmile = average(read(scores, "mouthSmileLeft"), read(scores, "mouthSmileRight"));
  const mouthFrown = average(read(scores, "mouthFrownLeft"), read(scores, "mouthFrownRight"));
  const mouthPress = average(read(scores, "mouthPressLeft"), read(scores, "mouthPressRight"));
  const browInnerUp = read(scores, "browInnerUp");

  const candidates = [
    { signal: "smile", score: mouthSmile },
    { signal: "tense", score: browDown * 0.55 + eyeSquint * 0.45 },
    { signal: "downcast", score: mouthFrown * 0.7 + browInnerUp * 0.3 },
    { signal: "angry", score: browDown * 0.45 + eyeSquint * 0.25 + mouthPress * 0.3 }
  ].sort((left, right) => right.score - left.score);

  const strongest = candidates[0];

  if (!strongest || strongest.score < SIGNAL_THRESHOLD) {
    return {
      signal: "neutral",
      confidence: roundScore(1 - (strongest?.score || 0)),
      evidence: []
    };
  }

  return {
    signal: strongest.signal,
    confidence: roundScore(strongest.score),
    evidence: collectEvidence(strongest.signal, scores)
  };
}
