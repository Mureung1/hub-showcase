import { useState } from "react";
import { REASON_OPTIONS } from "../lib/taskOptions";

// 회피 이유 재확인 체크포인트 (wireframe.md 4번의 ReasonCheckpoint).
// 레벨이 1 또는 3으로 처음 올랐을 때 NudgeModal 안에 자동으로 노출된다 —
// 사용자가 임의로 여는 상시 버튼이 아니라 봇이 먼저 물어보는 재확인 창.
// 옵션 데이터는 taskOptions.js의 REASON_OPTIONS를 그대로 재사용한다(따로 관리하지 않음).
function ReasonCheckpoint({ level, onSelect }) {
  // custom을 고른 경우에만 노출되는 자유 입력. RegisterPage와 동일한 패턴.
  const [selected, setSelected] = useState(null);
  const [customText, setCustomText] = useState("");

  function handleSelect(value) {
    // custom은 텍스트를 받아야 하므로 바로 확정하지 않고 입력 UI를 먼저 연다.
    if (value === "custom") {
      setSelected("custom");
      return;
    }
    onSelect(value, null);
  }

  function handleCustomSubmit() {
    onSelect("custom", customText.trim());
  }

  return (
    <div className="reason-checkpoint">
      <p className="reason-checkpoint-q">
        {level === 3
          ? "여러 번 미루고 있어요. 지금 막는 이유가 처음과 같나요?"
          : "지금 미루는 이유가 처음과 같나요? 달라졌다면 다시 골라주세요."}
      </p>
      <div className="reason-checkpoint-options">
        {REASON_OPTIONS.map(({ value, label }) => (
          <button
            key={value}
            type="button"
            className={
              selected === value
                ? "reason-checkpoint-opt reason-checkpoint-opt-on"
                : "reason-checkpoint-opt"
            }
            onClick={() => handleSelect(value)}
          >
            {label}
          </button>
        ))}
      </div>

      {selected === "custom" && (
        <div className="reason-checkpoint-custom">
          <input
            className="reason-checkpoint-input"
            type="text"
            placeholder="예: 완벽하게 하고 싶어서"
            value={customText}
            onChange={(e) => setCustomText(e.target.value)}
          />
          <button
            type="button"
            className="reason-checkpoint-confirm"
            onClick={handleCustomSubmit}
          >
            확인
          </button>
        </div>
      )}
    </div>
  );
}

export default ReasonCheckpoint;
