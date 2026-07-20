import React from "react";
import { ConversationPanel } from "./features/conversation";
import { AnalysisStatus } from "./features/emotion-analysis";
import { EmotionInputForm } from "./features/emotion-input";
import { EmotionResult } from "./features/emotion-result";
import { useEmotionSession } from "./features/emotion-session";
import { ObservationStatus } from "./features/observation-status";
import { ScenarioSelector } from "./features/scenario-simulation";
import ServiceHeader from "./shared/components/ServiceHeader";

export { analyzeMockContext } from "./features/emotion-analysis";

export default function App() {
  const {
    messages,
    aiStatus,
    selectedScenario,
    analysisStatus,
    emotionResult,
    analysisError,
    observation,
    isInputDisabled,
    handleScenarioChange,
    handleAnalyze,
    handleAnalyzeAgain
  } = useEmotionSession();

  return (
    <div className="app-root">
      <aside className="sidebar">
        <ServiceHeader status={aiStatus} />
        <ObservationStatus observation={observation} />
        <ScenarioSelector
          value={selectedScenario.value}
          onChange={handleScenarioChange}
          disabled={isInputDisabled}
        />
        <AnalysisStatus status={analysisStatus} error={analysisError} />
        <EmotionResult
          result={emotionResult}
          onAnalyzeAgain={handleAnalyzeAgain}
          disabled={analysisStatus === "analyzing"}
        />
      </aside>

      <ConversationPanel messages={messages}>
        <EmotionInputForm
          scenarioPreset={selectedScenario}
          disabled={isInputDisabled}
          onAnalyze={handleAnalyze}
        />
      </ConversationPanel>
    </div>
  );
}
