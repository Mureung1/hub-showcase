import { useState } from "react";

// Lv2에서만 노출되는 자유 텍스트 입력 (wireframe.md 4번의 FreeTextPrompt).
// plan.md 설계상 "공감 응답용, 로직 미반영" — 입력값은 이 컴포넌트의 로컬 상태에만
// 저장되고, 서버로 전송되거나 마이크로태스크/넛지 선택 로직에 반영되지 않는다.
function FreeTextPrompt() {
  const [note, setNote] = useState("");
  const [submitted, setSubmitted] = useState(false);

  function handleChange(e) {
    setNote(e.target.value);
    setSubmitted(false);
  }

  function handleSubmit() {
    if (!note.trim()) return;
    setSubmitted(true);
  }

  return (
    <div className="free-text-prompt">
      <p className="free-text-prompt-q">왜 아직 못 했는지 편하게 적어볼래요?</p>
      <div className="free-text-prompt-row">
        <input
          className="free-text-prompt-input"
          type="text"
          placeholder="예: 딴생각이 자꾸 나서요"
          value={note}
          onChange={handleChange}
        />
        <button
          type="button"
          className="free-text-prompt-confirm"
          onClick={handleSubmit}
        >
          보내기
        </button>
      </div>
      {submitted && <p className="free-text-prompt-ack">알려줘서 고마워요 🙂</p>}
    </div>
  );
}

export default FreeTextPrompt;
