import Character from "./Character";
import HomeButton from "./HomeButton";

// skills.md 고정 상수(task_category, 7개)의 한글 표시 라벨.
const CATEGORY_LABEL = {
  cleaning: "청소/정리",
  contact: "연락",
  paperwork: "문서작성",
  errands: "외출/이동",
  self_care: "자기관리",
  work: "학습/업무",
  other: "기타",
};

// microsteps: 아직 Notion에 저장되지 않은, 방금 쪼갠 결과(삭제로 로컬에서만 줄어들 수 있음).
// onDelete(index): 항목 하나를 목록에서 제거(로컬 상태만, Notion엔 아직 없음).
// onReshuffle: "전부 다시 쪼개기" — Brain Dump API를 같은 입력으로 재호출.
// onConfirm: "이대로 시작하기" — 지금 목록을 Notion에 저장하고 다음 화면으로.
export default function MicrostepReview({
  microsteps,
  onDelete,
  onReshuffle,
  onConfirm,
  isReshuffling = false,
  isSaving = false,
  error = null,
  onGoHome,
}) {
  const totalMinutes = microsteps.reduce((sum, step) => sum + step.estimatedMinutes, 0);
  const isEmpty = microsteps.length === 0;
  const isBusy = isReshuffling || isSaving;

  return (
    <main
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        minHeight: "100vh",
        padding: "48px 24px 260px",
        textAlign: "center",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <h1 style={{ fontFamily: "var(--font-title)", fontSize: "28px", marginBottom: "8px" }}>
        오늘 할 일, 확인해봐
      </h1>
      <p style={{ fontSize: "13px", color: "var(--ink-soft)", marginBottom: "28px" }}>
        {microsteps.length}개 · 다 하면 총{" "}
        <b style={{ color: "var(--sky-ink)" }}>{totalMinutes}분</b>
      </p>

      <div
        style={{
          width: "100%",
          maxWidth: "520px",
          display: "flex",
          flexDirection: "column",
          gap: "10px",
          marginBottom: "24px",
        }}
      >
        {microsteps.map((step, index) => (
          <div
            key={`${step.title}-${index}`}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              background: "var(--white)",
              border: "1px solid var(--cream-line)",
              borderRadius: "16px",
              padding: "14px 16px",
            }}
          >
            <span style={{ flex: 1, fontSize: "15px", textAlign: "left" }}>{step.title}</span>
            <span
              style={{
                fontSize: "11px",
                padding: "4px 10px",
                borderRadius: "100px",
                background: "var(--peach)",
                color: "var(--rose-ink)",
                whiteSpace: "nowrap",
              }}
            >
              {CATEGORY_LABEL[step.category] ?? step.category}
            </span>
            <span style={{ fontSize: "12px", color: "var(--ink-faint)", whiteSpace: "nowrap" }}>
              {step.estimatedMinutes}분
            </span>
            <button
              onClick={() => onDelete(index)}
              disabled={isBusy}
              aria-label={`${step.title} 삭제`}
              style={{
                width: "26px",
                height: "26px",
                borderRadius: "50%",
                border: "1px solid var(--cream-line)",
                background: "transparent",
                color: "var(--ink-faint)",
                fontSize: "14px",
                lineHeight: 1,
                cursor: isBusy ? "default" : "pointer",
              }}
            >
              ×
            </button>
          </div>
        ))}
        {isEmpty && (
          <p style={{ fontSize: "14px", color: "var(--ink-soft)" }}>
            전부 삭제했어요. &ldquo;전부 다시 쪼개기&rdquo;로 새로 받아보세요.
          </p>
        )}
      </div>

      {error && (
        <p style={{ fontSize: "13px", color: "var(--rose-ink)", marginBottom: "8px" }}>{error}</p>
      )}

      <div style={{ display: "flex", gap: "10px", marginBottom: "8px" }}>
        <button
          onClick={onReshuffle}
          disabled={isBusy}
          style={{
            padding: "16px 32px",
            borderRadius: "100px",
            border: "1px solid var(--cream-line)",
            background: "var(--white)",
            color: "var(--ink)",
            fontFamily: "var(--font-body)",
            fontSize: "16px",
            cursor: isBusy ? "default" : "pointer",
          }}
        >
          {isReshuffling ? "다시 쪼개는 중..." : "전부 다시 쪼개기"}
        </button>
        <button
          onClick={onConfirm}
          disabled={isBusy || isEmpty}
          style={{
            padding: "16px 32px",
            borderRadius: "100px",
            border: "none",
            background: "var(--ink)",
            color: "var(--white)",
            fontFamily: "var(--font-body)",
            fontSize: "16px",
            cursor: isBusy || isEmpty ? "default" : "pointer",
            opacity: isBusy || isEmpty ? 0.6 : 1,
          }}
        >
          {isSaving ? "저장하는 중..." : "이대로 시작하기"}
        </button>
      </div>

      {onGoHome && <HomeButton onClick={onGoHome} />}
      <Character closed />
    </main>
  );
}
