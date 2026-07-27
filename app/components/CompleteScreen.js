import Character from "./Character";
import HomeButton from "./HomeButton";

// task: 방금 끝낸 할 일 텍스트
// onGoHome: 새 Brain Dump를 시작하러 홈으로 돌아가는 버튼
export default function CompleteScreen({ task, onGoHome }) {
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
      <div
        style={{
          width: "56px",
          height: "56px",
          borderRadius: "50%",
          background: "var(--sky)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "28px",
        }}
      >
        ✓
      </div>
      <p style={{ color: "var(--ink-soft)" }}>{task}</p>
      <h1 style={{ fontSize: "24px" }}>오늘도 해냈다</h1>
      {onGoHome && <HomeButton onClick={onGoHome} label="새 할 일 적으러 가기" />}
      <Character />
    </main>
  );
}
