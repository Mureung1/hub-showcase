import React from "react";

export default function SituationInput({
  value,
  onChange,
  onKeyDown,
  disabled = false,
  maxLength = 500
}) {
  console.count("SituationInput render");

  const descriptionId = "situation-input-description";

  return (
    <div className="situation-input">
      <div className="field-heading">
        <label htmlFor="situation-text">지금 겪고 있는 상황</label>
        <span aria-live="polite">
          {value.length}/{maxLength}자
        </span>
      </div>
      <textarea
        id="situation-text"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={onKeyDown}
        placeholder="메시지를 입력하세요..."
        maxLength={maxLength}
        disabled={disabled}
        aria-describedby={descriptionId}
        rows={3}
      />
      <span id={descriptionId} className="sr-only">
        Enter 키로 분석하고 전송하며 Shift와 Enter 키를 함께 누르면 줄을 바꿉니다.
      </span>
    </div>
  );
}
