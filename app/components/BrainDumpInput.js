"use client";

import { useState } from "react";

// onSubmit: 사용자가 입력을 제출했을 때 부모(page.js)에게 텍스트를 전달하는 함수
export default function BrainDumpInput({ onSubmit }) {
  const [text, setText] = useState("");

  function handleSubmit() {
    if (text.trim() === "") return;
    onSubmit(text);
  }

  return (
    <main
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
        padding: "24px",
        gap: "24px",
      }}
    >
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="생각나는 대로 적어봐"
        style={{
          width: "100%",
          maxWidth: "480px",
          minHeight: "160px",
          padding: "20px",
          borderRadius: "16px",
          border: "1px solid var(--cream-line)",
          background: "var(--white)",
          color: "var(--ink)",
          fontFamily: "var(--font-body)",
          fontSize: "16px",
          resize: "none",
        }}
      />
      <button
        onClick={handleSubmit}
        style={{
          padding: "14px 32px",
          borderRadius: "100px",
          border: "none",
          background: "var(--rose)",
          color: "var(--rose-ink)",
          fontFamily: "var(--font-body)",
          fontSize: "16px",
          cursor: "pointer",
        }}
      >
        보내기
      </button>
    </main>
  );
}
