import Character from "./Character";
import HomeButton from "./HomeButton";

// task: 화면에 보여줄 마이크로 스텝 텍스트 (지금은 mock 데이터)
// onReady: "타이머 세팅, 준비하기" 버튼을 눌렀을 때 다음 화면으로 넘어가라고 알리는 함수
// onGoHome: 있으면 홈으로 돌아가는 버튼을 보여준다.
export default function TaskPreview({ task, onReady, onGoHome }) {
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
      <h1 style={{ fontSize: "34px", lineHeight: 1.4 }}>{task}</h1>

      <button
        onClick={onReady}
        style={{
          padding: "18px 44px",
          borderRadius: "100px",
          border: "none",
          background: "var(--ink)",
          color: "var(--white)",
          fontFamily: "var(--font-body)",
          fontSize: "18px",
          cursor: "pointer",
        }}
      >
        타이머 세팅, 준비하기
      </button>
      {onGoHome && <HomeButton onClick={onGoHome} />}
      <Character closed />
    </main>
  );
}
