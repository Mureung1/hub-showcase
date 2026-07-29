import React from "react";
import { ConversationPanel } from "./features/conversation";
import { AnalysisStatus } from "./features/emotion-analysis";
import { EmotionInputForm } from "./features/emotion-input";
import { EmotionResult } from "./features/emotion-result";
import { useEmotionSession } from "./features/emotion-session";
import { ObservationStatus } from "./features/observation-status";
import { ScenarioSelector } from "./features/scenario-simulation";
import ServiceHeader from "./shared/components/ServiceHeader";
import { GuestAccessPanel, useGuestAccess } from "./features/guest-access";

export default function App() {
  const guestAccess = useGuestAccess();
  const {
    messages,
    aiStatus,
    selectedScenario,
    analysisStatus,
    emotionResult,
    faceSignalMetadata,
    analysisError,
    observation,
    isInputDisabled,
    handleScenarioChange,
    handleAnalyze,
    handleAnalyzeAgain,
    handleLiveFaceSignalChange
  } = useEmotionSession({ guestKey: guestAccess.guestKey });

  return (
    <div className="app-root">
      <aside className="access-column">
        <ServiceHeader status={aiStatus} />
        <GuestAccessPanel
          mode={guestAccess.mode}
          issuedKey={guestAccess.issuedKey}
          status={guestAccess.status}
          error={guestAccess.error}
          onCreate={guestAccess.createGuest}
          onRecover={guestAccess.recoverGuest}
          onUseAnonymous={guestAccess.useAnonymous}
        />
      </aside>

      <section className="conversation-column" aria-label="카메라를 사용하는 대화">
        <div className="column-heading">
          <span>PRIVATE CONVERSATION</span>
          <h2>지금의 마음을 이야기해 주세요</h2>
          <p>카메라는 선택해서 켤 수 있고 영상은 기기 밖으로 나가지 않아요.</p>
        </div>
        <ConversationPanel messages={messages}>
          <EmotionInputForm
            scenarioPreset={selectedScenario}
            faceSignalMetadata={faceSignalMetadata}
            disabled={isInputDisabled}
            usesGenerativeAi={Boolean(guestAccess.guestKey)}
            onAnalyze={handleAnalyze}
            onLiveFaceSignalChange={handleLiveFaceSignalChange}
          />
        </ConversationPanel>
      </section>

      <aside className="signals-column">
        <AnalysisStatus status={analysisStatus} error={analysisError} />
        <EmotionResult
          result={emotionResult}
          onAnalyzeAgain={handleAnalyzeAgain}
          disabled={isInputDisabled}
        />
        <details className="signal-details">
          <summary>참고 신호 설정과 관찰 정보</summary>
          <ScenarioSelector
            value={selectedScenario.value}
            onChange={handleScenarioChange}
            disabled={isInputDisabled}
          />
          <ObservationStatus observation={observation} />
        </details>
      </aside>
    </div>
  );
}
