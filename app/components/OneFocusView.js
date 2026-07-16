// task: 지금 집중할 할 일 텍스트 (mock 데이터)
// onStart: "집중 시작" 버튼 클릭 시 호출
// onStruggle: "나 지금 힘들어" 버튼 클릭 시 호출
export default function OneFocusView({ task, onStart, onStruggle }) {
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
      }}
    >
      <h1 style={{ fontSize: "28px", lineHeight: 1.4 }}>{task}</h1>

      <div style={{ display: "flex", gap: "12px", marginTop: "8px" }}>
        <button
          onClick={onStart}
          style={{
            padding: "14px 32px",
            borderRadius: "100px",
            border: "none",
            background: "var(--ink)",
            color: "var(--white)",
            fontFamily: "var(--font-body)",
            fontSize: "16px",
            cursor: "pointer",
          }}
        >
          집중 시작
        </button>
        <button
          onClick={onStruggle}
          style={{
            padding: "14px 32px",
            borderRadius: "100px",
            border: "1px solid var(--lavender-line)",
            background: "var(--lavender)",
            color: "var(--lavender-ink)",
            fontFamily: "var(--font-body)",
            fontSize: "16px",
            cursor: "pointer",
          }}
        >
          나 지금 힘들어
        </button>
      </div>
    </main>
  );
}
