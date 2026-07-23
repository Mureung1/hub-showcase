// 캐릭터가 말하는 것처럼 보이는 말풍선. docs/prototype/design-board.html의 .cloud 원본 CSS 값을 옮겼다.
export default function SpeechBubble({ children, style }) {
  return (
    <div
      style={{
        position: "absolute",
        background: "var(--white)",
        border: "1px solid var(--cream-line)",
        borderRadius: "16px",
        padding: "10px 20px",
        fontFamily: "var(--font-title)",
        fontSize: "16px",
        color: "var(--ink)",
        whiteSpace: "nowrap",
        ...style,
      }}
    >
      {children}
      <div
        style={{
          position: "absolute",
          width: "11px",
          height: "11px",
          background: "var(--white)",
          border: "1px solid var(--cream-line)",
          borderRadius: "50%",
          bottom: "-13px",
          left: "40%",
        }}
      />
    </div>
  );
}
