import { useState } from "react";
import { parseCreditsInput, CREDITS_MIN, CREDITS_MAX } from "../utils/creditsInput";

function toInputValue(value) {
  return value === null || value === undefined ? "" : String(value);
}

// 학점 수 입력 칸. "더 자세히"(2단계·결과 화면) 안에서 다른 칸들과 나란히 선다.
// 숫자 칸은 글자를 칠 때마다 저장하면 키 입력마다 서버로 나간다. 칸을 벗어날 때 한 번만 저장한다.
function CreditsField({ subject, onChange }) {
  const [credits, setCredits] = useState(toInputValue(subject.credits));
  const [errorMessage, setErrorMessage] = useState("");

  function commit(raw) {
    const result = parseCreditsInput(raw);

    if (!result.ok) {
      setErrorMessage(result.message);
      return;
    }

    setErrorMessage("");
    onChange(subject.id, { credits: result.value });
  }

  return (
    <div className="form-group credits-field">
      <label className="form-label" htmlFor={`credits-${subject.id}`}>
        학점
      </label>
      <input
        id={`credits-${subject.id}`}
        className={`form-input${errorMessage ? " has-error" : ""}`}
        type="number"
        min={CREDITS_MIN}
        max={CREDITS_MAX}
        step="0.5"
        inputMode="decimal"
        placeholder="예: 3"
        value={credits}
        onChange={(event) => setCredits(event.target.value)}
        onBlur={(event) => commit(event.target.value)}
      />
      <p className="form-hint">학점이 높을수록 우선순위가 올라가요. 비우면 계산에서 빠져요.</p>
      {errorMessage && (
        <p className="form-error" role="alert">
          {errorMessage}
        </p>
      )}
    </div>
  );
}

export default CreditsField;
