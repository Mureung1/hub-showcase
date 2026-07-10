import type { SessionMode } from "../session/types";

interface SessionHeaderProps {
  mode: SessionMode;
  onChange: (mode: SessionMode) => void;
}

// 현재 세션(입고/출고)을 크게 보여주고 전환하는 바. 색은 화면 전체 물듦과 연동.
export function SessionHeader({ mode, onChange }: SessionHeaderProps) {
  return (
    <div className="session-header">
      <span className="session-header__label">
        {mode === "inbound" ? "입고" : "출고"} 세션
      </span>
      <div className="segmented" role="group" aria-label="세션 모드">
        <button
          type="button"
          className={`segmented__btn${mode === "inbound" ? " is-active" : ""}`}
          aria-pressed={mode === "inbound"}
          onClick={() => onChange("inbound")}
        >
          입고
        </button>
        <button
          type="button"
          className={`segmented__btn${mode === "outbound" ? " is-active" : ""}`}
          aria-pressed={mode === "outbound"}
          onClick={() => onChange("outbound")}
        >
          출고
        </button>
      </div>
    </div>
  );
}
