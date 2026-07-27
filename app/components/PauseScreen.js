"use client";

import { useState } from "react";
import Character from "./Character";

// 타이머 일시정지 화면(T20). 할 일 자체와 무관한 이유(전화, 다른 일 등)로 잠깐 멈출 때를 위한
// 것으로, Agent가 tool을 제안하는 "힘들어" 루프(S2)와는 별개다.
// onResume(reason): "다시 시작" 클릭 시 이유(빈 문자열 가능)를 담아 호출.
export default function PauseScreen({ onResume }) {
  const [reason, setReason] = useState("");

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
      }}
    >
      <h1 style={{ fontSize: "26px", lineHeight: 1.4 }}>잠깐 멈췄어요</h1>
      <div style={{ width: "100%", maxWidth: "320px" }}>
        <input
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="왜 멈췄는지 적어도 되고, 안 적어도 돼"
          style={{
            width: "100%",
            padding: "10px 0",
            border: "none",
            borderBottom: "1px solid var(--ink-faint)",
            background: "transparent",
            color: "var(--ink)",
            fontFamily: "var(--font-body)",
            fontSize: "16px",
            textAlign: "center",
          }}
        />
      </div>
      <button
        onClick={() => onResume(reason)}
        style={{
          padding: "18px 40px",
          borderRadius: "100px",
          border: "none",
          background: "var(--sky)",
          color: "var(--sky-ink)",
          fontFamily: "var(--font-body)",
          fontSize: "18px",
          cursor: "pointer",
        }}
      >
        다시 시작
      </button>
      <Character closed />
    </main>
  );
}
