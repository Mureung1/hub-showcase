"use client";

import { useState } from "react";
import Character from "./Character";
import SpeechBubble from "./SpeechBubble";
import HomeButton from "./HomeButton";

// onSubmit: 사용자가 입력을 제출했을 때 부모(page.js)에게 텍스트를 전달하는 함수
// isLoading: Agent가 마이크로 스텝으로 쪼개는 중인지
// error: 쪼개기가 실패했을 때 보여줄 메시지
// prompt: 캐릭터 말풍선 문구(기본은 부담 없이 적으라는 안내). T14: 기한을 되물을 때 그 질문으로 바뀜.
// notice: 에러는 아니지만 알려줄 안내 문구(T14: 전부 나중 날짜로 확정돼 오늘 보여줄 게 없을 때).
const DEFAULT_PROMPT =
  "잘 쓰려고 하지 말고 편하게 적어도 돼! 생각나는 거 다 써봐, 언제까지 할지도 같이 적어도 되고";

export default function BrainDumpInput({
  onSubmit,
  isLoading = false,
  error = null,
  prompt = DEFAULT_PROMPT,
  notice = null,
  onGoHome,
  onViewStats,
}) {
  const [text, setText] = useState("");

  function handleSubmit() {
    if (text.trim() === "" || isLoading) return;
    onSubmit(text);
    setText(""); // T14: 되물음에 답하고 나면 다음 답변을 새로 입력할 수 있게 비운다.
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
            background: "var(--ink)",
            color: "var(--white)",
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
        {notice && (
          <p style={{ color: "var(--ink-soft)", fontSize: "14px" }}>{notice}</p>
        )}
        {onGoHome && <HomeButton onClick={onGoHome} />}
        {onViewStats && (
          <button
            onClick={onViewStats}
            style={{
              background: "none",
              border: "none",
              fontSize: "12px",
              color: "var(--ink-faint)",
              textDecoration: "underline",
              cursor: "pointer",
              marginTop: "4px",
            }}
          >
            이번 주 통계 보기
          </button>
        )}
      </div>
      <SpeechBubble
        style={{
          bottom: "225px",
          left: "50%",
          transform: "translateX(-50%)",
          whiteSpace: "normal",
          maxWidth: "280px",
          textAlign: "center",
        }}
      >
        {prompt}
      </SpeechBubble>
      <Character />
    </main>
  );
}
