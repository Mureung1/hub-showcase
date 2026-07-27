// 홈(처음 Brain Dump 입력 화면)으로 돌아가는 버튼. 화면 왼쪽 위에 고정된 아이콘 버튼.
// 집중 흐름(focus/timer/timer-confirm)에는 일부러 안 넣는다 - 할 일 하는 도중엔 이탈 유도를 안 함.
export default function HomeButton({ onClick, label = "홈 화면으로 돌아가기" }) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      title={label}
      style={{
        position: "fixed",
        top: "20px",
        left: "20px",
        width: "40px",
        height: "40px",
        borderRadius: "50%",
        border: "1px solid var(--cream-line)",
        background: "var(--white)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
        zIndex: 10,
      }}
    >
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="var(--ink-soft)"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M3 11l9-8 9 8" />
        <path d="M5 10v10a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1V10" />
      </svg>
    </button>
  );
}
