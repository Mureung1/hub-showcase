import React from "react";

const statusMessages = {
  idle: "상황과 신호를 입력하면 감정 가능성을 살펴봅니다.",
  analyzing: "입력한 상황과 신호를 종합하고 있습니다.",
  completed: "감정 가능성 분석이 완료되었습니다.",
  error: "분석 중 문제가 발생했습니다. 입력을 확인하고 다시 시도해 주세요."
};

export default function AnalysisStatus({ status = "idle", error = "" }) {
  const message = status === "error" && error ? error : statusMessages[status] || statusMessages.idle;

  return (
    <div className={`analysis-status analysis-status-${status}`} role="status" aria-live="polite">
      {status === "analyzing" && <span className="status-dot" aria-hidden="true" />}
      <span>{message}</span>
    </div>
  );
}
