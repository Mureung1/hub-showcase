import { useState, useEffect } from "react";
import "./FocusMode.css";

function formatElapsed(totalSeconds) {
  const mm = String(Math.floor(totalSeconds / 60)).padStart(2, "0");
  const ss = String(totalSeconds % 60).padStart(2, "0");
  return `${mm}:${ss}`;
}

function FocusMode({ title, onComplete, onStop }) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const intervalId = setInterval(() => {
      setElapsed((prev) => prev + 1);
    }, 1000);

    // cleanup: 컴포넌트가 사라질 때 타이머를 반드시 해제
    return () => clearInterval(intervalId);
  }, []);

  return (
    <div className="focus-mode">
      <div className="focus-title">{title}</div>
      <div className="focus-clock">{formatElapsed(elapsed)}</div>
      <div className="focus-sub">
        지금 집중하고 있어요. 끝나면 완료를 눌러주세요.
      </div>
      <div className="focus-actions">
        <button className="btn btn-focus-secondary" onClick={onStop}>
          멈추기
        </button>
        <button className="btn btn-focus-primary" onClick={onComplete}>
          완료
        </button>
      </div>
    </div>
  );
}

export default FocusMode;
