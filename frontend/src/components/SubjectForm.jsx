import { useState } from "react";

function SubjectForm({ onShowResult }) {
  const [subjectName, setSubjectName] = useState("");

  function handleSubmit() {
    if (subjectName.trim() === "") {
      alert("과목명을 입력해 주세요.");
      return;
    }

    onShowResult();
  }

  return (
    <section>
      <h2>과목 정보 입력</h2>

      <label htmlFor="subjectName">과목명</label>

      <input
        id="subjectName"
        type="text"
        placeholder="예: 한방병리학"
        value={subjectName}
        onChange={(event) => setSubjectName(event.target.value)}
      />

      <button type="button" onClick={handleSubmit}>
        결과 확인
      </button>
    </section>
  );
}

export default SubjectForm;