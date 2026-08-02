"use client";

import { useEffect, useState } from "react";
import Character from "./Character";
import ThemeSwitcher from "./ThemeSwitcher";
import ThemeDecoration from "./ThemeDecoration";
import { themeBackgroundColor, themeTextColor } from "@/app/lib/theme";

function pad2(n) {
  return String(n).padStart(2, "0");
}

// deadlineExtraMinutes만큼 뒤로 미뤄진 오늘 자정 기준으로, 지금 시각/남은 시간 문구를 만든다.
function formatDeadlineStatus(now, deadlineExtraMinutes) {
  const currentTime = `${pad2(now.getHours())}:${pad2(now.getMinutes())}`;

  const deadline = new Date(now);
  deadline.setHours(24, 0, 0, 0);
  deadline.setMinutes(deadline.getMinutes() + deadlineExtraMinutes);

  const remainingMinutes = Math.max(Math.round((deadline - now) / 60000), 0);
  const hours = Math.floor(remainingMinutes / 60);
  const minutes = remainingMinutes % 60;
  const remainingText = hours > 0 ? `${hours}시간 ${minutes}분` : `${minutes}분`;

  return { currentTime, remainingText };
}

// task: 지금 집중할 할 일 텍스트 (mock 데이터)
// onStart: "집중 시작" 버튼 클릭 시 호출
// onStruggle: "나 지금 힘들어" 버튼 클릭 시 호출
// deadlineExtraMinutes/onExtendDeadline: 오늘 마감까지 남은 시간 표시 + 연장 버튼(T19)
// theme/onThemeChange: 화이트노이즈 테마(T22). 여기서 고른 테마가 이후 FocusTimer에도 이어진다.
export default function OneFocusView({
  task,
  onStart,
  onStruggle,
  deadlineExtraMinutes = 0,
  onExtendDeadline,
  theme = "daynight",
  onThemeChange,
}) {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timerId = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timerId);
  }, []);

  const { currentTime, remainingText } = formatDeadlineStatus(now, deadlineExtraMinutes);

  return (
    <main
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
        padding: "24px",
        gap: "16px",
        textAlign: "center",
        position: "relative",
        overflow: "hidden",
        background: themeBackgroundColor(theme, now),
      }}
    >
      <ThemeDecoration theme={theme} />
      {onThemeChange && (
        <div style={{ position: "absolute", top: "16px", left: "50%", transform: "translateX(-50%)" }}>
          <ThemeSwitcher theme={theme} onChange={onThemeChange} />
        </div>
      )}
      <h1 style={{ fontSize: "34px", lineHeight: 1.4, color: themeTextColor(theme, now) }}>{task}</h1>

      {onExtendDeadline && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            fontSize: "13px",
            color: themeTextColor(theme, now),
          }}
        >
          <span>
            지금 {currentTime} · 오늘 마감까지 {remainingText}
          </span>
          <button
            onClick={onExtendDeadline}
            style={{
              padding: "4px 12px",
              borderRadius: "100px",
              border: "1px solid var(--cream-line)",
              background: "var(--white)",
              color: "var(--ink-soft)",
              fontFamily: "var(--font-body)",
              fontSize: "12px",
              cursor: "pointer",
            }}
          >
            +1시간
          </button>
        </div>
      )}

      <div style={{ display: "flex", gap: "12px", marginTop: "8px" }}>
        <button
          onClick={onStart}
          style={{
            padding: "18px 40px",
            borderRadius: "100px",
            border: "none",
            background: "var(--ink)",
            color: "var(--white)",
            fontFamily: "var(--font-body)",
            fontSize: "18px",
            cursor: "pointer",
          }}
        >
          집중 시작
        </button>
        <button
          onClick={onStruggle}
          style={{
            padding: "18px 40px",
            borderRadius: "100px",
            border: "1px solid var(--cream-line)",
            background: "var(--white)",
            color: "var(--ink)",
            fontFamily: "var(--font-body)",
            fontSize: "18px",
            cursor: "pointer",
          }}
        >
          나 지금 힘들어
        </button>
      </div>
      <Character color={theme === "forest" ? "forest" : "rose"} />
    </main>
  );
}
