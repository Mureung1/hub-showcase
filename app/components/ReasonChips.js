import Character from "./Character";

const REASONS = [
  { value: "overwhelmed", label: "막막해요" },
  { value: "bored", label: "지루해요" },
  { value: "tired", label: "지쳤어요" },
  { value: "neutral", label: "그냥 그래요" },
];

// onSelect: 이유 칩 하나를 골랐을 때 그 reasonChip 값("overwhelmed" 등)을 전달
export default function ReasonChips({ onSelect }) {
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
        textAlign: "center",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <h1 style={{ fontSize: "28px", lineHeight: 1.4 }}>왜 힘든지 골라볼래?</h1>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "12px",
          width: "100%",
          maxWidth: "360px",
        }}
      >
        {REASONS.map((r) => (
          <button
            key={r.value}
            onClick={() => onSelect(r.value)}
            style={{
              padding: "20px 16px",
              borderRadius: "16px",
              border: "1px solid var(--cream-line)",
              background: "var(--white)",
              color: "var(--ink)",
              fontFamily: "var(--font-body)",
              fontSize: "16px",
              cursor: "pointer",
            }}
          >
            {r.label}
          </button>
        ))}
      </div>
      <Character />
    </main>
  );
}
