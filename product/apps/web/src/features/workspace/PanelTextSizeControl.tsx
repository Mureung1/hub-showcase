import type { PanelTextSize } from "./usePanelTextSize";

const options: Array<{ value: PanelTextSize; label: string }> = [
  { value: "compact", label: "작게" },
  { value: "default", label: "기본" },
  { value: "large", label: "크게" },
];

export function PanelTextSizeControl({
  value,
  onChange,
}: {
  value: PanelTextSize;
  onChange: (size: PanelTextSize) => void;
}) {
  return (
    <div className="panel-text-size-control" role="group" aria-label="패널 글자 크기">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          aria-pressed={value === option.value}
          className={value === option.value ? "is-selected" : ""}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
