import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "../lib/api";
import journeyLv0Background from "../assets/backgrounds/journey_lv0_clear.png";
import journeyLv1Background from "../assets/backgrounds/journey_lv1_partly_cloudy.png";
import journeyLv2Background from "../assets/backgrounds/journey_lv2_cloudy.png";
import journeyLv3Background from "../assets/backgrounds/journey_lv3_rain.png";
import journeyLv4Background from "../assets/backgrounds/journey_lv4_storm.png";
import nagbotWalkLv0 from "../assets/characters/nagbot_walk_lv0.png";
import nagbotWalkLv1 from "../assets/characters/nagbot_walk_lv1.png";
import nagbotWalkLv2 from "../assets/characters/nagbot_walk_lv2.png";
import nagbotWalkLv3 from "../assets/characters/nagbot_walk_lv3.png.png";
import nagbotWalkLv4 from "../assets/characters/nagbot_walk_lv4.png";
import CompletionMessage from "./CompletionMessage";
import FeedbackButtons from "./FeedbackButtons";
import "./FocusMode.css";

const FOCUS_JOURNEY_ASSETS = Object.freeze({
  0: { background: journeyLv0Background, character: nagbotWalkLv0, level: 0 },
  1: { background: journeyLv1Background, character: nagbotWalkLv1, level: 1 },
  2: { background: journeyLv2Background, character: nagbotWalkLv2, level: 2 },
  3: { background: journeyLv3Background, character: nagbotWalkLv3, level: 3 },
  4: { background: journeyLv4Background, character: nagbotWalkLv4, level: 4 },
});

function getFocusJourneyAssets(entryLevel) {
  if (!Number.isInteger(entryLevel) || entryLevel < 0 || entryLevel > 4) {
    return FOCUS_JOURNEY_ASSETS[0];
  }
  return FOCUS_JOURNEY_ASSETS[entryLevel];
}

function formatElapsed(totalSeconds) {
  const mm = String(Math.floor(totalSeconds / 60)).padStart(2, "0");
  const ss = String(totalSeconds % 60).padStart(2, "0");
  return `${mm}:${ss}`;
}

function calculateElapsed(startedAt) {
  if (!Number.isFinite(startedAt)) return 0;
  return Math.max(0, Math.floor((Date.now() - startedAt) / 1000));
}

// Focus 세션 v2의 시작 방식과 개입 컨텍스트를 완료 스냅샷까지 그대로 전달한다.
function FocusMode({
  taskId,
  title,
  startedAt,
  entryMode = "direct",
  microTask = null,
  entryLevel = null,
  journeyLevel = null,
  generationSource = "none",
  memoryEvidence = null,
  onSessionCompleted,
  onComplete,
  onStop,
}) {
  const navigate = useNavigate();
  const [elapsed, setElapsed] = useState(() => calculateElapsed(startedAt));
  const [errorMessage, setErrorMessage] = useState(null);
  const [phase, setPhase] = useState("focus"); // "focus" | "completed"
  const [feedback, setFeedback] = useState(null); // { value, saved } — 선택/저장 상태 표시용
  const [isCompleting, setIsCompleting] = useState(false);
  const completionInFlightRef = useRef(false);
  const [isStopping, setIsStopping] = useState(false);
  const stopInFlightRef = useRef(false);
  const journeyAssets = getFocusJourneyAssets(journeyLevel);

  useEffect(() => {
    // 완료 화면에서는 집중 시간이 더 이상 흐르지 않도록 멈춘다(Completion에 표시할
    // "집중 시간"이 화면을 보고 있는 동안 계속 늘어나면 안 되므로).
    if (phase !== "focus") return;
    setElapsed(calculateElapsed(startedAt));
    const intervalId = setInterval(() => {
      setElapsed(calculateElapsed(startedAt));
    }, 1000);

    // cleanup: 컴포넌트가 사라지거나 완료로 전환될 때 타이머를 반드시 해제
    return () => clearInterval(intervalId);
  }, [phase, startedAt]);

  async function recordEvent(eventType, extra = {}) {
    await apiFetch(`/api/tasks/${taskId}/events`, {
      method: "POST",
      body: JSON.stringify({ eventType, ...extra }),
    });
  }

  async function handleStop() {
    if (stopInFlightRef.current) return;
    stopInFlightRef.current = true;
    setIsStopping(true);
    try {
      setErrorMessage(null);
      // 현재 "멈추기"는 일시정지가 아니라 Focus 세션을 명시적으로 종료하는 동작이다.
      const durationSeconds = calculateElapsed(startedAt);
      await recordEvent("stopped", { durationSeconds });
      onStop?.();
    } catch (err) {
      console.error(err);
      setErrorMessage("멈추기 기록에 실패했어요. 다시 시도해주세요.");
    } finally {
      stopInFlightRef.current = false;
      setIsStopping(false);
    }
  }

  async function handleComplete() {
    if (completionInFlightRef.current) return;
    completionInFlightRef.current = true;
    setIsCompleting(true);
    try {
      setErrorMessage(null);
      const durationSeconds = calculateElapsed(startedAt);
      // v1 이관 세션의 unknown은 복구 상태에서만 사용한다. 서버의 신규 저장 계약에는
      // null로 보내면 History가 microTask 유무를 기준으로 unknown을 해석한다.
      const persistedGenerationSource =
        generationSource === "unknown" ? null : generationSource;
      await recordEvent("done", {
        durationSeconds,
        entryMode,
        entryLevel,
        microTask,
        generationSource: persistedGenerationSource,
        memoryEvidence,
      });
      setElapsed(durationSeconds);
      onSessionCompleted?.();
      setPhase("completed");
    } catch (err) {
      console.error(err);
      setErrorMessage("완료 기록에 실패했어요. 다시 시도해주세요.");
    } finally {
      completionInFlightRef.current = false;
      setIsCompleting(false);
    }
  }

  // 피드백은 선택 사항이며, 선택하더라도 더 이상 화면을 자동으로 닫지 않는다 —
  // 사용자가 "홈으로"/"기록 보기"를 직접 눌러야 이 화면을 벗어난다.
  // 저장 실패해도 조용히 무시한다(#35/#42와 동일한 원칙, alert 없음) — 피드백은
  // 부가 데이터일 뿐 화면 이탈 가능 여부에 영향을 주지 않는다.
  function handleFeedbackSelect(value) {
    setFeedback({ value, saved: false });
    apiFetch(`/api/tasks/${taskId}/feedbacks`, {
      method: "POST",
      body: JSON.stringify({ response: value }),
    })
      .then(() => setFeedback({ value, saved: true }))
      .catch((err) => console.error(err));
  }

  function handleGoHome() {
    onComplete?.();
  }

  function handleGoHistory() {
    onComplete?.();
    navigate("/history");
  }

  if (phase === "completed") {
    return (
      <div className="focus-mode focus-mode-completed">
        <CompletionMessage
          title={title}
          microTask={microTask}
          elapsedLabel={formatElapsed(elapsed)}
          entryLevel={entryLevel}
        />
        <FeedbackButtons onSelect={handleFeedbackSelect} selectedValue={feedback?.value ?? null} />
        {feedback && (
          <div className="focus-feedback-status">
            {feedback.saved ? "피드백을 저장했어요." : "피드백을 선택했어요."}
          </div>
        )}
        <div className="focus-exit-actions">
          <button className="btn btn-focus-primary" onClick={handleGoHome}>
            홈으로
          </button>
          <button className="focus-history-link" onClick={handleGoHistory}>
            기록 보기
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="focus-mode focus-mode-journey"
      style={{ backgroundImage: `url(${journeyAssets.background})` }}
    >
      <div
        className={`focus-journey-header${microTask ? "" : " focus-journey-header-single"}`}
      >
        <div className="focus-journey-info focus-journey-task">
          <span className="focus-journey-label">현재 할 일</span>
          <p className="focus-title">{title}</p>
        </div>
        {microTask && (
          <div className="focus-journey-info focus-microtask">
            <span className="focus-microtask-label">첫 행동</span>
            <p className="focus-microtask-body">{microTask}</p>
          </div>
        )}
      </div>
      <div className="focus-journey-stage">
        <div className="focus-journey-timer">
          <div className="focus-clock">{formatElapsed(elapsed)}</div>
          <div className="focus-sub">
            잔소리봇과 함께 한 걸음씩 나아가고 있어요.
          </div>
        </div>
        <img
          className={`focus-journey-character focus-journey-character-lv${journeyAssets.level}`}
          src={journeyAssets.character}
          alt=""
          aria-hidden="true"
        />
      </div>
      {errorMessage && <div className="focus-error">{errorMessage}</div>}
      <div className="focus-actions focus-journey-actions">
        <button
          className="btn btn-focus-secondary"
          onClick={handleStop}
          disabled={isStopping}
        >
          멈추기
        </button>
        <button
          className="btn btn-focus-primary"
          onClick={handleComplete}
          disabled={isCompleting}
        >
          완료
        </button>
      </div>
    </div>
  );
}

export default FocusMode;
