// 말풍선 — 클릭 가능한 내비게이션/선택 전용 컴포넌트
// tailDirection: "b" | "t" | "l" | "r"
// empty: true면 텍스트 없이 빈 말풍선(placeholder)으로 표시

export default function Bubble({
  children,
  onClick,
  tailDirection = "b",
  empty = false,
  selected = false,
  style,
}) {
  const classNames = [
    "bubble",
    `bubble--tail-${tailDirection}`,
    empty ? "bubble--empty" : "",
    selected ? "bubble--selected" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <button type="button" className={classNames} style={style} onClick={onClick}>
      {!empty && children}
    </button>
  );
}
