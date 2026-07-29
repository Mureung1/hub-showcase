const EMOTION_KEYS = ["anxiety", "sadness", "anger", "joy", "neutral"];

function clamp(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return 0;
  return Math.min(1, Math.max(0, number));
}

function toFeatureMap(features) {
  if (!Array.isArray(features)) return {};

  return features.reduce((result, feature) => {
    if (typeof feature?.name === "string") {
      result[feature.name] = clamp(feature.score);
    }
    return result;
  }, {});
}

function average(scores, names) {
  return names.reduce((total, name) => total + (scores[name] || 0), 0) / names.length;
}

function round(value) {
  return Math.round(value * 100) / 100;
}

/**
 * Converts facial movement strength into UI score adjustments. These values
 * are heuristics, not probabilities or a diagnosis of the user's emotion.
 */
export function deriveLiveFaceEmotionAdjustments(features) {
  const scores = toFeatureMap(features);
  const smile = average(scores, ["mouthSmileLeft", "mouthSmileRight"]);
  const frown = average(scores, ["mouthFrownLeft", "mouthFrownRight"]);
  const browDown = average(scores, ["browDownLeft", "browDownRight"]);
  const eyeSquint = average(scores, ["eyeSquintLeft", "eyeSquintRight"]);
  const eyeWide = average(scores, ["eyeWideLeft", "eyeWideRight"]);
  const mouthPress = average(scores, ["mouthPressLeft", "mouthPressRight"]);
  const browInnerUp = scores.browInnerUp || 0;
  const strongestMovement = Math.max(
    smile,
    frown,
    browDown,
    eyeSquint,
    eyeWide,
    mouthPress,
    browInnerUp
  );

  const adjustments = {
    anxiety: eyeWide * 46 + browInnerUp * 18 + mouthPress * 12,
    sadness: frown * 58 + browInnerUp * 28,
    anger: browDown * 42 + eyeSquint * 22 + mouthPress * 38,
    joy: smile * 78,
    neutral: Math.max(0, 1 - strongestMovement) * 34
  };

  return EMOTION_KEYS.reduce((result, key) => {
    result[key] = round(adjustments[key]);
    return result;
  }, {});
}

