import { scenarioPresets } from "../../scenario-simulation";
import { analyzeMockEmotion } from "./analyzeMockEmotion";

const defaultScenario = scenarioPresets.normal;

export function analyzeMockContext({
  inputText = "",
  recentMessages = [],
  selectedScenario = "normal",
  faceSignal,
  faceFeatures,
  voiceSignal
} = {}) {
  const scenario = scenarioPresets[selectedScenario] || defaultScenario;

  return analyzeMockEmotion({
    situationText: inputText,
    faceSignal: faceSignal || scenario.faceSignal,
    faceFeatures,
    voiceSignal: voiceSignal || scenario.voiceSignal,
    recentMessages,
    selectedScenario
  });
}
