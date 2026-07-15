import { useState } from "react";

function SubjectForm({ onShowResult }) {
  const [subjectName, setSubjectName] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  function handleSubmit() {
    if (subjectName.trim() === "") {
      setErrorMessage("과목명을 입력해 주세요.");
      return;
    }

    setErrorMessage("");
    onShowResult();
  }

  function handleChange(event) {
    setSubjectName(event.target.value);

    if (errorMessage !== "") {
      setErrorMessage("");
    }
  }

  return (
    <section className="card">
      <h2 className="section-title">과목 정보 입력</h2>

      <div className="form-group">
        <label className="form-label" htmlFor="subjectName">
          과목명
        </label>

        <input
          id="subjectName"
          className={`form-input${errorMessage ? " has-error" : ""}`}
          type="text"
          placeholder="예: 한방병리학"
          value={subjectName}
          onChange={handleChange}
        />

        <p className="form-error">{errorMessage}</p>
      </div>

      <button type="button" className="button button-primary" onClick={handleSubmit}>
        결과 확인
      </button>
    </section>
  );
}

export default SubjectForm;
