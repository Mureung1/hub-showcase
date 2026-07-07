// 4단계 진행 표시기 (CV 업로드 → 디자인 선택 → 생성 → 완성)
export const STEPS = [
  { key: "upload", label: "CV 업로드" },
  { key: "design", label: "디자인 선택" },
  { key: "generate", label: "AI 생성" },
  { key: "result", label: "완성" },
];

export default function Stepper({ current }) {
  const idx = STEPS.findIndex((s) => s.key === current);
  return (
    <ol className="stepper">
      {STEPS.map((s, i) => {
        const state = i < idx ? "done" : i === idx ? "active" : "";
        return (
          <li key={s.key} className={`step ${state}`}>
            <span className="step-no">{i < idx ? "✓" : i + 1}</span>
            <span className="step-label">{s.label}</span>
          </li>
        );
      })}
    </ol>
  );
}
