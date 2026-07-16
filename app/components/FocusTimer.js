"use client";

import { useEffect, useState } from "react";

// durationMinutes: 타이머 길이(분). 기본 25분.
// onFinish: 시간이 다 됐을 때 호출
export default function FocusTimer({ durationMinutes = 25, onFinish }) {
  // "시작한 시각"만 기억한다. 남은 시간은 그 시각 기준으로 매번 다시 계산한다.
  // (새로고침해도 시작 시각만 있으면 남은 시간을 다시 정확히 구할 수 있다)
  const [startedAt] = useState(() => Date.now());
  const [remainingSeconds, setRemainingSeconds] = useState(durationMinutes * 60);

  useEffect(() => {
    const totalSeconds = durationMinutes * 60;

    const tick = () => {
      const elapsed = Math.floor((Date.now() - startedAt) / 1000);
      const remaining = Math.max(totalSeconds - elapsed, 0);
      setRemainingSeconds(remaining);
      if (remaining === 0) onFinish();
    };

    tick();
    const timerId = setInterval(tick, 1000);
    return () => clearInterval(timerId);
  }, [startedAt, durationMinutes, onFinish]);

  const minutes = String(Math.floor(remainingSeconds / 60)).padStart(2, "0");
  const seconds = String(remainingSeconds % 60).padStart(2, "0");

  return (
    <main
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
      }}
    >
      <div
        style={{
          width: "220px",
          height: "220px",
          borderRadius: "50%",
          border: "6px solid var(--sky-line)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "var(--font-body)",
          fontSize: "40px",
          color: "var(--sky-ink)",
        }}
      >
        {minutes}:{seconds}
      </div>
    </main>
  );
}
