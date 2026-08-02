// 화면 하단에 자리잡는 토끼 캐릭터. docs/prototype/design-board.html의 .companion 원본 CSS 값을 그대로 옮겼다.
// closed: true면 웃는 눈(곡선), false(기본)면 뜬 눈(점)
// color: "rose"(기본) | "forest" — 숲 테마일 때만 몸통 색이 바뀐다(T22, whitenoise-themes.html 근거)
export default function Character({ closed = false, color = "rose" }) {
  const bodyColor = color === "forest" ? "var(--forest)" : "var(--rose)";
  const bodyLine = color === "forest" ? "var(--forest-line)" : "var(--rose-line)";
  return (
    <div
      aria-hidden="true"
      style={{
        position: "absolute",
        bottom: "-2px",
        left: "50%",
        transform: "translateX(-50%) scale(2.2)",
        transformOrigin: "bottom center",
        width: "150px",
        height: "64px",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: "-18px",
          left: "20px",
          width: "34px",
          height: "46px",
          background: bodyColor,
          border: `1px solid ${bodyLine}`,
          borderRadius: "50% 50% 45% 45%",
        }}
      />
      <div
        style={{
          position: "absolute",
          top: "-18px",
          right: "20px",
          width: "34px",
          height: "46px",
          background: bodyColor,
          border: `1px solid ${bodyLine}`,
          borderRadius: "50% 50% 45% 45%",
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: "2px",
          width: "16px",
          height: "12px",
          background: bodyColor,
          border: `1px solid ${bodyLine}`,
          borderRadius: "50% 50% 20% 20%",
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: 0,
          right: "2px",
          width: "16px",
          height: "12px",
          background: bodyColor,
          border: `1px solid ${bodyLine}`,
          borderRadius: "50% 50% 20% 20%",
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: "14px",
          right: "14px",
          height: "52px",
          background: bodyColor,
          border: `1px solid ${bodyLine}`,
          borderBottom: "none",
          borderRadius: "50% 50% 0 0 / 65% 65% 0 0",
        }}
      />
      {closed ? (
        <>
          <div
            style={{
              position: "absolute",
              top: "23px",
              left: "52px",
              width: "10px",
              height: "5px",
              borderTop: "1.6px solid var(--ink)",
              borderRadius: "50%",
            }}
          />
          <div
            style={{
              position: "absolute",
              top: "23px",
              right: "52px",
              width: "10px",
              height: "5px",
              borderTop: "1.6px solid var(--ink)",
              borderRadius: "50%",
            }}
          />
        </>
      ) : (
        <>
          <div
            style={{
              position: "absolute",
              top: "20px",
              left: "52px",
              width: "6px",
              height: "9px",
              background: "var(--ink)",
              borderRadius: "50%",
            }}
          />
          <div
            style={{
              position: "absolute",
              top: "20px",
              right: "52px",
              width: "6px",
              height: "9px",
              background: "var(--ink)",
              borderRadius: "50%",
            }}
          />
        </>
      )}
    </div>
  );
}
