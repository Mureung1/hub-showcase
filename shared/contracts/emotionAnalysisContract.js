export const FACE_SIGNALS = [
  "neutral",
  "smile",
  "tense",
  "downcast",
  "angry"
];

export const VOICE_SIGNALS = [
  "normal",
  "fast",
  "low",
  "strong",
  "bright"
];

export const SCENARIOS = ["normal", "tension", "tired"];
export const FACE_SIGNAL_SOURCES = ["manual", "camera"];

export const CAMERA_FEATURE_NAMES = [
  "mouthSmileLeft",
  "mouthSmileRight",
  "browDownLeft",
  "browDownRight",
  "browInnerUp",
  "eyeSquintLeft",
  "eyeSquintRight",
  "mouthFrownLeft",
  "mouthFrownRight",
  "mouthPressLeft",
  "mouthPressRight"
];

export const EMOTION_ANALYSIS_LIMITS = {
  situationTextLength: 500,
  aiResponseLength: 2000,
  analysisResultBytes: 20_000,
  cameraEvidenceCount: 3,
  historyLimit: 20,
  maximumHistoryLimit: 100
};

export const FACE_SIGNAL_HEURISTIC_VERSION = "v1";
