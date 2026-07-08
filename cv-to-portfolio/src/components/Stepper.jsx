// 4단계 진행 표시기 (CV 업로드 → 디자인 선택 → 생성 → 완성)
// 완료된 이전 단계는 클릭해 되돌아갈 수 있다(onStep). 현재 단계는 aria-current로 표시.
export const STEPS = [
  { key: "upload", label: "CV 업로드" },
  { key: "design", label: "디자인 선택" },
  { key: "generate", label: "AI 생성" },
  { key: "result", label: "완성" },
];

export default function Stepper({ current, onStep }) {
  const idx = STEPS.findIndex((s) => s.key === current);
  return (
    <ol className="stepper">
      {STEPS.map((s, i) => {
        const state = i < idx ? "done" : i === idx ? "active" : "";
        const clickable = Boolean(onStep) && i < idx; // 완료된 단계만 되돌아가기 허용
        const inner = (
          <>
            <span className="step-no">{i < idx ? "✓" : i + 1}</span>
            <span className="step-label">{s.label}</span>
          </>
        );
        return (
          <li
            key={s.key}
            className={`step ${state} ${clickable ? "clickable" : ""}`}
            aria-current={i === idx ? "step" : undefined}
          >
            {clickable ? (
              <button type="button" className="step-btn" onClick={() => onStep(s.key)}>
                {inner}
              </button>
            ) : (
              inner
            )}
          </li>
        );
      })}
    </ol>
  );
}
