import Character from "./Character";

const TOOL_LABELS = {
  split_node: "지금 할 일을 더 작게 쪼개볼까요?",
  reorder_graph: "순서를 좀 바꿔볼까요?",
  suggest_break: "잠깐 쉬어볼까요?",
  shrink_step: "목표를 살짝 줄여볼까요?",
  swap_task: "다른 할 일을 먼저 해볼까요?",
  postpone_task: "이건 내일 해볼까요?",
  encourage: "조금만 더 힘내볼까요?",
  end_session: "오늘은 여기까지 할까요?",
};

// proposedTool, reason: /api/struggle 응답. onAccept/onReject: 버튼 클릭 시 호출.
// isLoading: 거절 후 재판단(재요청) 중일 때 버튼을 잠깐 비활성화
export default function ProposalCard({ proposedTool, reason, onAccept, onReject, isLoading }) {
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
      <h1 style={{ fontSize: "26px", lineHeight: 1.4 }}>
        {TOOL_LABELS[proposedTool] ?? "이렇게 해볼까요?"}
      </h1>
      <p style={{ fontSize: "14px", color: "var(--ink-soft)", maxWidth: "320px" }}>{reason}</p>

      <div style={{ display: "flex", gap: "12px", marginTop: "8px" }}>
        <button
          onClick={onAccept}
          disabled={isLoading}
          style={{
            padding: "18px 40px",
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
          수락
        </button>
        <button
          onClick={onReject}
          disabled={isLoading}
          style={{
            padding: "18px 40px",
            borderRadius: "100px",
            border: "1px solid var(--cream-line)",
            background: "var(--white)",
            color: "var(--ink)",
            fontFamily: "var(--font-body)",
            fontSize: "18px",
            cursor: isLoading ? "default" : "pointer",
            opacity: isLoading ? 0.6 : 1,
          }}
        >
          {isLoading ? "다시 생각하는 중..." : "거절"}
        </button>
      </div>
      <Character closed={isLoading} />
    </main>
  );
}
