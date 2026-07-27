// 펼침/접힘 표시. ▾ 같은 문자 기호는 기기마다 크기·정렬이 달라서 SVG 로 그린다.
function Chevron({ open = false }) {
  return (
    <svg
      className={`chevron${open ? " is-open" : ""}`}
      width="12"
      height="12"
      viewBox="0 0 12 12"
      aria-hidden="true"
      focusable="false"
    >
      <path
        d="M2.5 4.5 L6 8 L9.5 4.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default Chevron;
