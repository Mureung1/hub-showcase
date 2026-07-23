"use client";

import { useState } from "react";
import Character from "./Character";
import SpeechBubble from "./SpeechBubble";

// onSubmit: 사용자가 입력을 제출했을 때 부모(page.js)에게 텍스트를 전달하는 함수
// isLoading: Agent가 마이크로 스텝으로 쪼개는 중인지
// error: 쪼개기가 실패했을 때 보여줄 메시지
export default function BrainDumpInput({ onSubmit, isLoading = false, error = null }) {
  const [text, setText] = useState("");

  function handleSubmit() {
    if (text.trim() === "" || isLoading) return;
    onSubmit(text);
  }

  return (
    <main
      style={{
        position: "relative",
        overflow: "hidden",
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div
        style={{
          flex: "1 1 auto",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "12px",
          padding: "24px",
          paddingBottom: "230px",
        }}
      >
        <div style={{ width: "100%", maxWidth: "560px" }}>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            style={{
              width: "100%",
              minHeight: "20vh",
              padding: "0 0 16px 0",
              border: "none",
              borderBottom: "1px solid var(--ink-faint)",
              background: "transparent",
              color: "var(--ink)",
              fontFamily: "var(--font-title)",
              fontSize: "22px",
              resize: "none",
              textAlign: "left",
            }}
          />
        </div>
        <button
          onClick={handleSubmit}
          disabled={isLoading}
          style={{
            padding: "18px 44px",
            borderRadius: "100px",
            border: "none",
            background: "var(--rose)",
            color: "var(--rose-ink)",
            fontFamily: "var(--font-body)",
            fontSize: "18px",
            cursor: isLoading ? "default" : "pointer",
            opacity: isLoading ? 0.6 : 1,
          }}
        >
          {isLoading ? "쪼개는 중..." : "보내기"}
        </button>

        {error && (
          <p style={{ color: "var(--rose-ink)", fontSize: "14px" }}>{error}</p>
        )}
      </div>
      <SpeechBubble style={{ bottom: "225px", left: "50%", transform: "translateX(-50%)" }}>
        생각나는 대로 적어봐
      </SpeechBubble>
      <Character />
    </main>
  );
}
