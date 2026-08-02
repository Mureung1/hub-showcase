"use client";

import { useEffect, useState } from "react";
import { isNightTime } from "@/app/lib/theme";

// T22: 화면 구석에 배치하는 작은 테마 장식 요소. 중앙의 텍스트·버튼과 안 겹치게 코너에만 둬서
// z-index 계산 없이 그냥 절대 위치로 그려도 안전하다(docs/prototype/whitenoise-themes.html 기반).
export default function ThemeDecoration({ theme }) {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timerId = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(timerId);
  }, []);

  if (theme === "forest") {
    return (
      <div aria-hidden="true">
        <div
          style={{
            position: "absolute",
            top: "70px",
            left: "15%",
            width: "10px",
            height: "14px",
            background: "var(--forest)",
            borderRadius: "0 60% 0 60%",
            transform: "rotate(20deg)",
            opacity: 0.8,
          }}
        />
        <div
          style={{
            position: "absolute",
            top: "120px",
            right: "18%",
            width: "10px",
            height: "14px",
            background: "var(--forest)",
            borderRadius: "0 60% 0 60%",
            transform: "rotate(-30deg)",
            opacity: 0.8,
          }}
        />
        <div
          style={{
            position: "absolute",
            top: "96px",
            left: "30%",
            width: "10px",
            height: "14px",
            background: "var(--forest)",
            borderRadius: "0 60% 0 60%",
            transform: "rotate(60deg)",
            opacity: 0.8,
          }}
        />
        <svg
          style={{ position: "absolute", top: "56px", left: "22%" }}
          width="18"
          height="10"
          viewBox="0 0 18 10"
        >
          <path
            d="M0 6c3-5 6-5 9 0 3-5 6-5 9 0"
            stroke="var(--forest-deep)"
            strokeWidth="1.3"
            fill="none"
          />
        </svg>
      </div>
    );
  }

  if (theme === "cafe") {
    return (
      <div
        aria-hidden="true"
        style={{ position: "absolute", bottom: "70px", right: "22%", width: "34px", height: "42px" }}
      >
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: "6px",
            top: "8px",
            background: "var(--coffee)",
            border: "1px solid var(--coffee-line)",
            borderRadius: "0 0 8px 8px",
          }}
        />
        <div
          style={{
            position: "absolute",
            right: "-6px",
            top: "10px",
            width: "10px",
            height: "10px",
            border: "2px solid var(--coffee-line)",
            borderLeft: "none",
            borderRadius: "0 8px 8px 0",
          }}
        />
        {[6, 16, 26].map((left) => (
          <div
            key={left}
            style={{
              position: "absolute",
              width: "2px",
              height: "16px",
              left: `${left}px`,
              top: "-16px",
              background: "var(--coffee-line)",
              opacity: 0.5,
              borderRadius: "2px",
            }}
          />
        ))}
      </div>
    );
  }

  // daynight
  const night = isNightTime(now);
  return (
    <div
      aria-hidden="true"
      style={{
        position: "absolute",
        top: "64px",
        right: "18%",
        width: "26px",
        height: "26px",
        borderRadius: "50%",
        background: night ? "var(--night-soft)" : "var(--rose)",
        border: `1px solid ${night ? "var(--night-line)" : "var(--rose-line)"}`,
      }}
    />
  );
}
