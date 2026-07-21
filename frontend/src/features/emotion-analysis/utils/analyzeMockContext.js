import { scenarioPresets } from "../../scenario-simulation";
import { analyzeMockEmotion } from "./analyzeMockEmotion";

const defaultScenario = scenarioPresets.normal;

export function analyzeMockContext({
  inputText = "",
  recentMessages = [],
  selectedScenario = "normal",
  faceSignal,
  voiceSignal
} = {}) {
  const scenario = scenarioPresets[selectedScenario] || defaultScenario;

  return analyzeMockEmotion({
    situationText: inputText,
    faceSignal: faceSignal || scenario.faceSignal,
    voiceSignal: voiceSignal || scenario.voiceSignal,
    recentMessages,
    selectedScenario
  });
}
