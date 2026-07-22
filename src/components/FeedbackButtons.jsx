import { useState } from "react";
import "./FeedbackButtons.css";

// #39: 저장(API 호출)은 이번 이슈 범위 밖 — #40이 onSelect 자리에 저장 API를 얹는다.
const FEEDBACK_OPTIONS = [
  { value: "helpful", label: "도움됐음" },
  { value: "annoying", label: "귀찮았음" },
];

function FeedbackButtons({ onSelect }) {
  const [selected, setSelected] = useState(null);

  function handleClick(value) {
    setSelected(value);
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
          {option.label}
        </button>
      ))}
    </div>
  );
}

export default FeedbackButtons;
