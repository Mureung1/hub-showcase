"use client";

import { useEffect, useState } from "react";
import Character from "./Character";

// durationMinutes: 타이머 길이(분). 기본 25분.
// startedAt: 이 스텝을 시작한 시각(Date). 남은 시간은 이 시각 기준으로 매번 다시 계산한다.
//   (page.js가 localStorage에 같이 저장해두기 때문에, 새로고침해도 같은 시각을 다시 받아
//   정확한 남은 시간을 재계산할 수 있다. FocusTimer 자체는 시작 시각을 따로 기억하지 않는다.)
// onFinish: 시간이 다 됐을 때 호출
export default function FocusTimer({ durationMinutes = 25, startedAt, onFinish }) {
  const [remainingSeconds, setRemainingSeconds] = useState(durationMinutes * 60);

  useEffect(() => {
    const totalSeconds = durationMinutes * 60;
    const startedAtMs = startedAt instanceof Date ? startedAt.getTime() : Date.now();

    const tick = () => {
      const elapsed = Math.floor((Date.now() - startedAtMs) / 1000);
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
  const totalSeconds = durationMinutes * 60;
  const remainingRatio = totalSeconds === 0 ? 0 : remainingSeconds / totalSeconds;

  return (
    <main
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          width: "220px",
          height: "220px",
          borderRadius: "50%",
          border: "2px solid var(--sky-line)",
          position: "relative",
          overflow: "hidden",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            width: "100%",
            height: `${remainingRatio * 100}%`,
            background: "var(--sky)",
            transition: "height 1s linear",
          }}
        />
        <span
          style={{
            position: "relative",
            fontFamily: "var(--font-body)",
            fontSize: "40px",
            color: "var(--sky-ink)",
          }}
        >
          {minutes}:{seconds}
        </span>
      </div>
      <Character closed />
    </main>
  );
}
