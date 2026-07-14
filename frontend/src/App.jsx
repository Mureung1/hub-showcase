import { useState } from "react";
import "./App.css";

function App() {
  const [subjectName, setSubjectName] = useState("");

  function handleAddSubject() {
    const trimmedName = subjectName.trim();

    if (trimmedName === "") {
      alert("과목명을 입력해 주세요.");
      return;
    }

    alert(`${trimmedName} 과목이 추가되었습니다.`);
    setSubjectName("");
  }

  return (
    <main className="app-container">
      <h1>시험 우선순위 계산기</h1>

      <p className="app-description">
        여러 과목 중 무엇부터 공부할지 정해보세요.
      </p>

      <div className="form-group">
        <label htmlFor="subjectName">과목명</label>

        <input
          id="subjectName"
          type="text"
          placeholder="예: 한방병리학"
          value={subjectName}
          onChange={(event) => setSubjectName(event.target.value)}
        />
      </div>

      <button
        className="add-button"
        type="button"
        onClick={handleAddSubject}
      >
        과목 추가
      </button>

      <p className="current-value">
        현재 입력값: {subjectName || "아직 입력하지 않음"}
      </p>
    </main>
  );
}

export default App;