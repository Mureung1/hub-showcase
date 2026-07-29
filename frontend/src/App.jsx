import React, { useState } from "react";
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
  const [appView, setAppView] = useState("access");
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
  } = useEmotionSession({
    guestKey: guestAccess.guestKey,
    aiGuestKey: guestAccess.aiGuestKey
  });

  const startAnonymousConversation = async () => {
    const started = await guestAccess.startAnonymous();
    if (started) setAppView("conversation");
  };

  const recoverGuestConversation = async (key) => {
    const recovered = await guestAccess.recoverGuest(key);
    if (recovered) setAppView("conversation");
    return recovered;
  };

  const leaveGuestConversation = () => {
    guestAccess.leaveGuest();
    setAppView("access");
  };

  const returnHome = async () => {
    if (!guestAccess.guestKey) await guestAccess.endAnonymous();
    setAppView("access");
  };

  return (
    <div className={`app-root app-root--${appView}`}>
      {appView === "access" && (
      <main className="access-column">
        <ServiceHeader status={aiStatus} />
        <GuestAccessPanel
          mode={guestAccess.mode}
          issuedKey={guestAccess.issuedKey}
          status={guestAccess.status}
          error={guestAccess.error}
          onCreate={guestAccess.createGuest}
          onRecover={recoverGuestConversation}
          onUseAnonymous={startAnonymousConversation}
          onContinue={() => setAppView("conversation")}
          onLeaveGuest={leaveGuestConversation}
        />
      </main>
      )}

      {appView === "conversation" && (
      <section className="conversation-column" aria-label="카메라를 사용하는 대화">
        <ServiceHeader status={aiStatus} onHome={returnHome} />
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
            usesGenerativeAi={Boolean(guestAccess.aiGuestKey)}
            onAnalyze={handleAnalyze}
            onLiveFaceSignalChange={handleLiveFaceSignalChange}
          />
        </ConversationPanel>
        <button
          type="button"
          className="view-toggle"
          onClick={() => setAppView("result")}
        >
          감정 신호 보기
        </button>
      </section>
      )}

      {appView === "result" && (
      <aside className="signals-column">
        <ServiceHeader status={aiStatus} onHome={returnHome} />
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
        <button
          type="button"
          className="view-toggle"
          onClick={() => setAppView("conversation")}
        >
          다시 대화하기
        </button>
      </aside>
      )}
    </div>
  );
}
