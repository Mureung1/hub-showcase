import { useState, useEffect, useRef } from "react";
import { apiFetch } from "../lib/api";
import CompletionMessage from "./CompletionMessage";
import FeedbackButtons from "./FeedbackButtons";
import "./FocusMode.css";

// 피드백 선택 스타일이 화면에 보인 뒤 닫히도록 짧게 지연한다(#39).
const FEEDBACK_CLOSE_DELAY_MS = 500;

function formatElapsed(totalSeconds) {
  const mm = String(Math.floor(totalSeconds / 60)).padStart(2, "0");
  const ss = String(totalSeconds % 60).padStart(2, "0");
  return `${mm}:${ss}`;
}

function FocusMode({ taskId, title, onComplete, onStop }) {
  const [elapsed, setElapsed] = useState(0);
  const [errorMessage, setErrorMessage] = useState(null);
  const [phase, setPhase] = useState("focus"); // "focus" | "completed"
  const feedbackTimeoutRef = useRef(null);

  useEffect(() => {
    const intervalId = setInterval(() => {
      setElapsed((prev) => prev + 1);
    }, 1000);

    // cleanup: 컴포넌트가 사라질 때 타이머를 반드시 해제
    return () => clearInterval(intervalId);
  }, []);

  useEffect(() => {
    // 언마운트 시 대기 중인 피드백 닫기 타이머도 정리
    return () => clearTimeout(feedbackTimeoutRef.current);
  }, []);

  async function recordEvent(eventType) {
    await apiFetch(`/api/tasks/${taskId}/events`, {
      method: "POST",
      body: JSON.stringify({ eventType }),
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
    try {
      setErrorMessage(null);
      await recordEvent("done");
      setPhase("completed");
    } catch (err) {
      console.error(err);
      setErrorMessage("완료 기록에 실패했어요. 다시 시도해주세요.");
    }
  }

  // 저장 실패해도 완료→닫힘 흐름은 그대로 유지한다(#35/#42와 동일한 원칙) — 피드백은
  // 부가 데이터일 뿐 사용자가 다시 시도하게 막을 정도로 중요하지 않다.
  function handleFeedbackSelect(value) {
    apiFetch(`/api/tasks/${taskId}/feedbacks`, {
      method: "POST",
      body: JSON.stringify({ response: value }),
    }).catch((err) => console.error(err));

    feedbackTimeoutRef.current = setTimeout(() => {
      onComplete?.();
    }, FEEDBACK_CLOSE_DELAY_MS);
  }

  if (phase === "completed") {
    return (
      <div className="focus-mode">
        <CompletionMessage />
        <FeedbackButtons onSelect={handleFeedbackSelect} />
      </div>
    );
  }

  return (
    <div className="focus-mode">
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
        <button className="btn btn-focus-primary" onClick={handleComplete}>
          완료
        </button>
      </div>
    </div>
  );
}

export default FocusMode;
