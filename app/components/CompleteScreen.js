import Character from "./Character";
import HomeButton from "./HomeButton";

// completedCount: 오늘 이 배치에서 끝낸 마이크로스텝 전체 개수(T17)
// onGoHome: 새 Brain Dump를 시작하러 홈으로 돌아가는 버튼
export default function CompleteScreen({ completedCount, onGoHome }) {
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
      <p style={{ color: "var(--ink-soft)" }}>오늘 마무리한 할 일</p>
      <h1 style={{ fontSize: "24px" }}>{completedCount}개 해냈다</h1>
      {onGoHome && <HomeButton onClick={onGoHome} label="새 할 일 적으러 가기" />}
      <Character />
    </main>
  );
}
