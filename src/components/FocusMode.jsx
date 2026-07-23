import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "../lib/api";
import CompletionMessage from "./CompletionMessage";
import FeedbackButtons from "./FeedbackButtons";
import "./FocusMode.css";

function formatElapsed(totalSeconds) {
  const mm = String(Math.floor(totalSeconds / 60)).padStart(2, "0");
  const ss = String(totalSeconds % 60).padStart(2, "0");
  return `${mm}:${ss}`;
}

// microTask/entryLevel은 Lv2 모달에서 "이것부터 시작하기"로 진입했을 때만 채워진다.
// 홈 카드를 직접 클릭해 들어온 기존 경로는 둘 다 null이라 해당 블록을 그대로 생략한다.
function FocusMode({ taskId, title, microTask = null, entryLevel = null, onComplete, onStop }) {
  const navigate = useNavigate();
  const [elapsed, setElapsed] = useState(0);
  const [errorMessage, setErrorMessage] = useState(null);
  const [phase, setPhase] = useState("focus"); // "focus" | "completed"
  const [feedback, setFeedback] = useState(null); // { value, saved } — 선택/저장 상태 표시용
  const [isCompleting, setIsCompleting] = useState(false);
  const completionInFlightRef = useRef(false);

  useEffect(() => {
    // 완료 화면에서는 집중 시간이 더 이상 흐르지 않도록 멈춘다(Completion에 표시할
    // "집중 시간"이 화면을 보고 있는 동안 계속 늘어나면 안 되므로).
    if (phase !== "focus") return;
    const intervalId = setInterval(() => {
      setElapsed((prev) => prev + 1);
    }, 1000);

    // cleanup: 컴포넌트가 사라지거나 완료로 전환될 때 타이머를 반드시 해제
    return () => clearInterval(intervalId);
  }, [phase]);

  async function recordEvent(eventType, extra = {}) {
    await apiFetch(`/api/tasks/${taskId}/events`, {
      method: "POST",
      body: JSON.stringify({ eventType, ...extra }),
    });
  }

  async function handleStop() {
    try {
      setErrorMessage(null);
      await recordEvent("stopped");
      onStop?.();
    } catch (err) {
      console.error(err);
      setErrorMessage("멈추기 기록에 실패했어요. 다시 시도해주세요.");
    }
  }

  async function handleComplete() {
    if (completionInFlightRef.current) return;
    completionInFlightRef.current = true;
    setIsCompleting(true);
    try {
      setErrorMessage(null);
      // entryLevel/microTask는 STEP1에서 이미 넘겨받은 값 그대로 스냅샷으로
      // 저장한다(재생성하지 않음) — History가 이 시점 값을 그대로 보여줘야 한다.
      await recordEvent("done", { durationSeconds: elapsed, entryLevel, microTask });
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
  // 사용자가 "홈으로"/"History 보기"를 직접 눌러야 이 화면을 벗어난다.
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
      <div className="focus-mode">
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
          <button className="btn btn-focus-secondary" onClick={handleGoHome}>
            홈으로
          </button>
          <button className="btn btn-focus-primary" onClick={handleGoHistory}>
            History 보기
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="focus-mode">
      {microTask && (
        <div className="focus-microtask">
          <span className="focus-microtask-label">지금 이것부터</span>
          <p className="focus-microtask-body">{microTask}</p>
        </div>
      )}
      <div className="focus-title">{title}</div>
      <div className="focus-clock">{formatElapsed(elapsed)}</div>
      <div className="focus-sub">
        지금 집중하고 있어요. 끝나면 완료를 눌러주세요.
      </div>
      {errorMessage && <div className="focus-error">{errorMessage}</div>}
      <div className="focus-actions">
        <button className="btn btn-focus-secondary" onClick={handleStop}>
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
