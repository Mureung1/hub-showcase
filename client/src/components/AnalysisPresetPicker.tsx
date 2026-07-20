export type AnalysisPreset = "fast" | "standard" | "detailed";

interface PresetOption {
  value: AnalysisPreset;
  icon: string;
  name: string;
  tag?: string;
  desc: string;
}

const PRESETS: PresetOption[] = [
  { value: "fast", icon: "⚡", name: "빠름", desc: "핵심 의존성 구조만 스캔 · 약 30초" },
  { value: "standard", icon: "⚙", name: "기본", tag: "권장", desc: "의존성 + 중복 코드 탐지 · 약 2분" },
  {
    value: "detailed",
    icon: "🔍",
    name: "상세",
    desc: "Prefab 구조 + 리팩토링 대상까지 전수 분석 · 약 5분+",
  },
];

interface Props {
  value: AnalysisPreset | "";
  disabled: boolean;
  onChange: (preset: AnalysisPreset) => void;
}

export default function AnalysisPresetPicker({ value, disabled, onChange }: Props) {
  return (
    <div
      style={{
        borderTop: "1px solid var(--border)",
        paddingTop: 14,
        marginTop: 4,
        opacity: disabled ? 0.4 : 1,
        pointerEvents: disabled ? "none" : "auto",
      }}
    >
      <label className="label-mono" style={{ marginBottom: 8 }}>
        분석 범위 프리셋
      </label>
      {PRESETS.map((p) => (
        <label key={p.value} className={`preset${value === p.value ? " selected" : ""}`}>
          <input
            type="radio"
            name="preset"
            checked={value === p.value}
            disabled={disabled}
            onChange={() => onChange(p.value)}
          />
          <span>{p.icon}</span>
          <div>
            <div className="name">
              {p.name}
              {p.tag && <span className="tag">{p.tag}</span>}
            </div>
            <div className="desc">{p.desc}</div>
          </div>
        </label>
      ))}
    </div>
  );
}
