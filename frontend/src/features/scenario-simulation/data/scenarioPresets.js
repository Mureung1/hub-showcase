export const scenarioPresets = {
  normal: {
    value: "normal",
    label: "평소",
    faceSignal: "neutral",
    voiceSignal: "normal",
    observation: {
      faceDetected: true,
      gaze: "정면",
      voiceTone: "평소",
      movementLevel: "보통",
      confidence: 0.82
    }
  },
  tension: {
    value: "tension",
    label: "긴장",
    faceSignal: "tense",
    voiceSignal: "fast",
    observation: {
      faceDetected: true,
      gaze: "회피",
      voiceTone: "빠름",
      movementLevel: "많음",
      confidence: 0.65
    }
  },
  tired: {
    value: "tired",
    label: "피곤",
    faceSignal: "downcast",
    voiceSignal: "low",
    observation: {
      faceDetected: true,
      gaze: "아래",
      voiceTone: "느림",
      movementLevel: "적음",
      confidence: 0.78
    }
  }
};

export const scenarioOptions = Object.values(scenarioPresets).map(({ value, label }) => ({
  value,
  label
}));
