import { useState } from "react";
import "./FeedbackButtons.css";

// #39: 저장(API 호출)은 이번 이슈 범위 밖 — #40이 onSelect 자리에 저장 API를 얹는다.
const FEEDBACK_OPTIONS = [
  { value: "helpful", icon: "👍", label: "도움됐어요" },
  { value: "annoying", icon: "👎", label: "아쉬웠어요" },
];

// selectedValue: 부모가 저장 상태까지 함께 관리하고 싶을 때 넘기는 controlled 값.
// 넘기지 않으면(기존 사용처) 내부 state로만 동작해 기존 동작을 그대로 유지한다.
function FeedbackButtons({ onSelect, selectedValue }) {
  const [internalSelected, setInternalSelected] = useState(null);
  const selected = selectedValue !== undefined ? selectedValue : internalSelected;

  function handleClick(value) {
    setInternalSelected(value);
    onSelect?.(value);
  }

  return (
    <div className="feedback-buttons">
      {FEEDBACK_OPTIONS.map((option) => (
        <button
          key={option.value}
          type="button"
          className={
            selected === option.value ? "btn-feedback btn-feedback-selected" : "btn-feedback"
          }
          onClick={() => handleClick(option.value)}
        >
          <span className="btn-feedback-icon" aria-hidden="true">
            {option.icon}
          </span>
          <span>{option.label}</span>
        </button>
      ))}
    </div>
  );
}

export default FeedbackButtons;
