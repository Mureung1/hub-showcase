export const FIXTURE_SESSION_ID = "7d7e3d50-c7a8-4d36-85fa-6a4dceca1077";

export function createAnalysisResult(overrides = {}) {
  return {
    scores: [{ key: "neutral", label: "중립", score: 100 }],
    possibleStates: [],
    evidence: ["테스트 입력"],
    responseApproach: "continue_normally",
    needsConfirmation: false,
    ...overrides
  };
}

export function createManualAnalysisPayload(overrides = {}) {
  return {
    sessionId: FIXTURE_SESSION_ID,
    situationText: "오늘 발표가 걱정돼.",
    faceSignal: "tense",
    faceSignalSource: "manual",
    faceSignalConfidence: null,
    faceSignalEvidence: [],
    faceSignalHeuristicVersion: null,
    voiceSignal: "fast",
    selectedScenario: "tension",
    analysisResult: createAnalysisResult(),
    aiResponse: "어떤 부분이 가장 신경 쓰였어?",
    ...overrides
  };
}

export function createCameraAnalysisPayload(overrides = {}) {
  return createManualAnalysisPayload({
    faceSignal: null,
    faceSignalSource: "camera",
    faceSignalConfidence: 0.78,
    faceSignalEvidence: ["mouthSmileLeft", "mouthSmileRight"],
    faceSignalHeuristicVersion: "v1",
    ...overrides
  });
}
