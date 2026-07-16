import { useState, useEffect } from "react";
import { apiFetch } from "../lib/api";
import "./FocusMode.css";

function formatElapsed(totalSeconds) {
  const mm = String(Math.floor(totalSeconds / 60)).padStart(2, "0");
  const ss = String(totalSeconds % 60).padStart(2, "0");
  return `${mm}:${ss}`;
}

function FocusMode({ taskId, title, onComplete, onStop }) {
  const [elapsed, setElapsed] = useState(0);
  const [errorMessage, setErrorMessage] = useState(null);

  useEffect(() => {
    const intervalId = setInterval(() => {
      setElapsed((prev) => prev + 1);
    }, 1000);

    // cleanup: 컴포넌트가 사라질 때 타이머를 반드시 해제
    return () => clearInterval(intervalId);
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
      onComplete?.();
    } catch (err) {
      console.error(err);
      setErrorMessage("완료 기록에 실패했어요. 다시 시도해주세요.");
    }
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
