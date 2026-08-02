"use client";

import { useEffect, useState } from "react";
import Character from "./Character";
import SpeechBubble from "./SpeechBubble";
import ThemeDecoration from "./ThemeDecoration";
import ThemeSound from "./ThemeSound";
import { themeBackgroundColor, intensityToSaturate } from "@/app/lib/theme";

// durationMinutes: 타이머 길이(분). 기본 25분.
// startedAt: 이 스텝을 시작한 시각(Date). 남은 시간은 이 시각 기준으로 매번 다시 계산한다.
//   (page.js가 localStorage에 같이 저장해두기 때문에, 새로고침해도 같은 시각을 다시 받아
//   정확한 남은 시간을 재계산할 수 있다. FocusTimer 자체는 시작 시각을 따로 기억하지 않는다.)
// onFinish: 시간이 다 됐을 때 호출
// caption: 있으면 캐릭터 위 말풍선으로 보여준다(T15: 연장 판단 이유 표시용). BrainDumpInput의
// SpeechBubble과 같은 위치(bottom: 225px)를 써서 캐릭터와의 배치가 화면마다 일관되게 한다.
// onPause: 있으면 오른쪽 위에 일시정지 버튼을 보여준다(T20). 할 일 자체와 무관한 이유로
// 잠깐 멈출 때를 위한 것이라, 이 버튼은 focus/timer 흐름 안에서만 예외적으로 노출한다.
// theme: 화이트노이즈 테마(T22). OneFocusView에서 고른 테마를 그대로 이어받아 배경·캐릭터에 반영.
export default function FocusTimer({
  durationMinutes = 25,
  startedAt,
  onFinish,
  caption,
  onPause,
  theme = "daynight",
  intensity = 60,
  soundEnabled = false,
}) {
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
        background: themeBackgroundColor(theme),
      }}
    >
      <ThemeSound theme={theme} enabled={soundEnabled} volume={intensity / 100} />
      <div style={{ filter: `saturate(${intensityToSaturate(intensity)}%)` }}>
        <ThemeDecoration theme={theme} />
      </div>
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
            transition: intensity < 30 ? "none" : "height 1s linear",
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
      {onPause && (
        <button
          onClick={onPause}
          aria-label="일시정지"
          title="일시정지"
          style={{
            position: "fixed",
            top: "20px",
            right: "20px",
            width: "40px",
            height: "40px",
            borderRadius: "50%",
            border: "1px solid var(--cream-line)",
            background: "var(--white)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            fontSize: "16px",
            color: "var(--ink-soft)",
            zIndex: 10,
          }}
        >
          ⏸
        </button>
      )}
      {caption && (
        <SpeechBubble
          style={{
            bottom: "225px",
            left: "50%",
            transform: "translateX(-50%)",
            whiteSpace: "normal",
            maxWidth: "260px",
            textAlign: "center",
          }}
        >
          {caption}
        </SpeechBubble>
      )}
      <div style={{ filter: `saturate(${intensityToSaturate(intensity)}%)` }}>
        <Character closed color={theme === "forest" ? "forest" : "rose"} />
      </div>
    </main>
  );
}
