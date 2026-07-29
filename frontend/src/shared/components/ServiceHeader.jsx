import React from "react";

const statusLabels = {
  waiting: "대기 중",
  listening: "듣는 중",
  thinking: "생각 중",
  speaking: "말하는 중"
};

export default function ServiceHeader({ status = "waiting", onHome }) {
  return (
    <header className="ai-card">
      <div className="ai-avatar" aria-hidden="true" />
      <div>
        <h1 className="ai-name">관계형 AI</h1>
        <div className={`ai-status ai-status-${status}`} role="status" aria-live="polite">
          {statusLabels[status] || status}
        </div>
      </div>
      {onHome && (
        <button type="button" className="ai-card__home" onClick={onHome}>
          처음으로
        </button>
      )}
    </header>
  );
}
