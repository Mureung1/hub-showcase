import React, { useEffect, useRef } from "react";

export default function ConversationPanel({ messages, children }) {
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  return (
    <main className="main">
      <div
        className="messages"
        ref={scrollRef}
        role="log"
        aria-label="대화 내용"
        aria-live="polite"
        aria-relevant="additions text"
      >
        {messages.map((message) => (
          <div
            key={message.id}
            className={`message ${message.role === "user" ? "user" : "ai"}`}
          >
            <div className="message-content">{message.content}</div>
          </div>
        ))}
      </div>
      {children}
    </main>
  );
}
