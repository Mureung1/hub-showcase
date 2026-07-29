import { scenarioPresets } from "../../scenario-simulation";
import { analyzeEmotionSignals } from "./analyzeEmotionSignals";

const defaultScenario = scenarioPresets.normal;

export function analyzeEmotionContext({
  inputText = "",
  recentMessages = [],
  selectedScenario = "normal",
  faceSignal,
  faceFeatures,
  voiceSignal
} = {}) {
  const scenario = scenarioPresets[selectedScenario] || defaultScenario;

  return analyzeEmotionSignals({
    situationText: inputText,
    faceSignal: faceSignal || scenario.faceSignal,
    faceFeatures,
    voiceSignal: voiceSignal || scenario.voiceSignal,
    recentMessages,
    selectedScenario
  });
}
