import type { PanelTextSize } from "./usePanelTextSize";

const options: Array<{ value: PanelTextSize; label: string; shortLabel: string }> = [
  { value: "compact", label: "작게", shortLabel: "A−" },
  { value: "default", label: "기본", shortLabel: "A" },
  { value: "large", label: "크게", shortLabel: "A+" },
];

export function PanelTextSizeControl({
  value,
  onChange,
}: {
  value: PanelTextSize;
  onChange: (size: PanelTextSize) => void;
}) {
  return (
    <div className="panel-text-size-control" role="group" aria-label="분석 패널 글자 크기">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          aria-label={option.label}
          aria-pressed={value === option.value}
          className={value === option.value ? "is-selected" : ""}
          title={`분석 패널 글자를 ${option.label}`}
          onClick={() => onChange(option.value)}
        >
          <span className="panel-text-size-full-label">{option.label}</span>
          <span className="panel-text-size-short-label" aria-hidden="true">
            {option.shortLabel}
          </span>
        </button>
      ))}
    </div>
  );
}
