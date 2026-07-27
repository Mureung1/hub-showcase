import Character from "./Character";

// 타이머가 0이 됐을 때 뜨는 확인 화면(T15). onYes: 다 끝났다고 확인 → 완료 처리.
// onNo: 아직 더 필요하다 → Agent에게 연장 분을 판단받아 타이머 재시작.
// isLoading: 연장 판단 요청 중. error: 연장 요청 실패 시 표시할 메시지, onRetry로 재시도.
export default function TimerConfirm({ onYes, onNo, isLoading, error, onRetry }) {
  if (error) {
    return (
      <main
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "100vh",
          gap: "16px",
          textAlign: "center",
          padding: "24px",
        }}
      >
        <p>{error}</p>
        <button onClick={onRetry}>다시 시도</button>
      </main>
    );
  }

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
      <h1 style={{ fontSize: "26px", lineHeight: 1.4 }}>이 스텝 다 끝났어?</h1>

      <div style={{ display: "flex", gap: "12px", marginTop: "8px" }}>
        <button
          onClick={onYes}
          disabled={isLoading}
          style={{
            padding: "18px 40px",
            borderRadius: "100px",
            border: "none",
            background: "var(--ink)",
            color: "var(--white)",
            fontFamily: "var(--font-body)",
            fontSize: "18px",
            cursor: isLoading ? "default" : "pointer",
            opacity: isLoading ? 0.6 : 1,
          }}
        >
          응, 다 했어
        </button>
        <button
          onClick={onNo}
          disabled={isLoading}
          style={{
            padding: "18px 40px",
            borderRadius: "100px",
            border: "1px solid var(--cream-line)",
            background: "var(--white)",
            color: "var(--ink)",
            fontFamily: "var(--font-body)",
            fontSize: "18px",
            cursor: isLoading ? "default" : "pointer",
            opacity: isLoading ? 0.4 : 1,
          }}
        >
          {isLoading ? "생각하는 중..." : "아니, 더 필요해"}
        </button>
      </div>
      <Character closed={isLoading} />
    </main>
  );
}
