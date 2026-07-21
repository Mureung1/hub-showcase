import { useState } from "react";
import ScoreSelector from "./ScoreSelector";
import { getDaysUntil, formatDday } from "../utils/daysUntil";

const INITIAL_FORM = {
  name: "",
  examDate: "",
  understanding: 3,
  difficulty: 3,
  gradeWeight: 40,
  grading: 3,
  studyAmount: 3,
};

// 각 1~5 단계가 무슨 뜻인지 알려주는 라벨. "3"이 사람마다 다른 문제를 줄인다.
const UNDERSTANDING_LEVELS = ["안 봤음", "개념만", "절반쯤", "거의 다", "완벽"];
const DIFFICULTY_LEVELS = ["매우 쉬움", "쉬움", "보통", "어려움", "매우 어려움"];
const GRADING_LEVELS = ["매우 후하게", "후한 편", "보통", "짠 편", "매우 짜게"];
const STUDY_AMOUNT_LEVELS = ["아주 적음", "적음", "보통", "많음", "아주 많음"];

function SubjectInputPage({
  subjects,
  onAddSubject,
  onUpdateSubject,
  onRemoveSubject,
  onShowResult,
}) {
  const [form, setForm] = useState(INITIAL_FORM);
  const [editingId, setEditingId] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");

  const isEditing = editingId !== null;
  const daysUntilForm = form.examDate ? getDaysUntil(form.examDate) : null;

  function updateField(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));

    if (errorMessage !== "") {
      setErrorMessage("");
    }
  }

  function resetForm() {
    setForm(INITIAL_FORM);
    setEditingId(null);
    setErrorMessage("");
  }

  function isDuplicateName(name) {
    const normalized = name.trim().toLowerCase();
    return subjects.some(
      (subject) =>
        subject.id !== editingId &&
        subject.name.trim().toLowerCase() === normalized
    );
  }

  function handleSubmit() {
    const name = form.name.trim();

    if (name === "") {
      setErrorMessage("과목명을 입력해 주세요.");
      return;
    }

    if (form.examDate === "") {
      setErrorMessage("시험 날짜를 선택해 주세요.");
      return;
    }

    if (isDuplicateName(name)) {
      setErrorMessage("이미 추가한 과목이에요.");
      return;
    }

    const gradeWeight = Number(form.gradeWeight);
    if (
      form.gradeWeight === "" ||
      !Number.isInteger(gradeWeight) ||
      gradeWeight < 0 ||
      gradeWeight > 100
    ) {
      setErrorMessage("학점 반영 비율을 0~100 사이로 입력해 주세요.");
      return;
    }

    const payload = {
      name,
      examDate: form.examDate,
      understanding: form.understanding,
      difficulty: form.difficulty,
      gradeWeight,
      grading: form.grading,
      studyAmount: form.studyAmount,
    };

    if (isEditing) {
      onUpdateSubject(editingId, payload);
    } else {
      onAddSubject(payload);
    }

    resetForm();
  }

  function handleEdit(subject) {
    setForm({
      name: subject.name,
      examDate: subject.examDate,
      understanding: subject.understanding,
      difficulty: subject.difficulty,
      gradeWeight: subject.gradeWeight ?? 40,
      grading: subject.grading ?? 3,
      studyAmount: subject.studyAmount ?? 3,
    });
    setEditingId(subject.id);
    setErrorMessage("");
  }

  function handleRemove(subject) {
    if (editingId === subject.id) {
      resetForm();
    }
    onRemoveSubject(subject.id);
  }

  function handleShowResult() {
    if (subjects.length === 0) {
      setErrorMessage("과목을 한 개 이상 추가해 주세요.");
      return;
    }

    onShowResult();
  }

  return (
    <section>
      <div className="card">
        <h2 className="section-title">
          {isEditing ? "과목 정보 수정" : "과목 정보 입력"}
        </h2>

        <div className="form-stack">
          <div className="form-group">
            <label className="form-label" htmlFor="subjectName">
              과목명
            </label>
            <input
              id="subjectName"
              className={`form-input${errorMessage ? " has-error" : ""}`}
              type="text"
              placeholder="예: 한방병리학"
              value={form.name}
              onChange={(event) => updateField("name", event.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="examDate">
              시험 날짜
            </label>
            <input
              id="examDate"
              className="form-input"
              type="date"
              value={form.examDate}
              onChange={(event) => updateField("examDate", event.target.value)}
            />
            {daysUntilForm !== null && (
              <p className={`form-hint${daysUntilForm < 0 ? " is-warning" : ""}`}>
                {daysUntilForm < 0
                  ? `이미 지난 날짜예요 (${formatDday(daysUntilForm)})`
                  : formatDday(daysUntilForm)}
              </p>
            )}
          </div>

          <ScoreSelector
            label="이해도"
            value={form.understanding}
            onChange={(value) => updateField("understanding", value)}
            levelLabels={UNDERSTANDING_LEVELS}
          />

          <ScoreSelector
            label="난이도"
            value={form.difficulty}
            onChange={(value) => updateField("difficulty", value)}
            levelLabels={DIFFICULTY_LEVELS}
          />

          <div className="form-group">
            <label className="form-label" htmlFor="gradeWeight">
              학점 반영 비율 (%)
            </label>
            <input
              id="gradeWeight"
              className="form-input"
              type="number"
              min="0"
              max="100"
              inputMode="numeric"
              value={form.gradeWeight}
              onChange={(event) => updateField("gradeWeight", event.target.value)}
            />
            <p className="form-hint">
              이 시험이 성적에서 차지하는 비율이에요. 예: 기말 40%
            </p>
          </div>

          <ScoreSelector
            label="교수님 학점 성향"
            value={form.grading}
            onChange={(value) => updateField("grading", value)}
            levelLabels={GRADING_LEVELS}
          />

          <ScoreSelector
            label="공부 분량 (시험 범위)"
            value={form.studyAmount}
            onChange={(value) => updateField("studyAmount", value)}
            levelLabels={STUDY_AMOUNT_LEVELS}
          />

          <p className="form-error">{errorMessage}</p>

          <div className="form-actions">
            <button
              type="button"
              className="button button-secondary"
              onClick={handleSubmit}
            >
              {isEditing ? "수정 완료" : "+ 과목 추가"}
            </button>
            {isEditing && (
              <button
                type="button"
                className="button button-ghost"
                onClick={resetForm}
              >
                취소
              </button>
            )}
          </div>
        </div>
      </div>

      {subjects.length > 0 ? (
        <>
          <h3 className="subsection-title">추가된 과목 ({subjects.length})</h3>

          <ul className="entry-list">
            {subjects.map((subject) => (
              <li
                key={subject.id}
                className={`entry-item${
                  editingId === subject.id ? " is-editing" : ""
                }`}
              >
                <div className="entry-main">
                  <span className="entry-name">{subject.name}</span>
                  <span className="entry-meta">
                    {formatDday(getDaysUntil(subject.examDate))} · 이해도{" "}
                    {subject.understanding} · 난이도 {subject.difficulty} · 학점{" "}
                    {subject.gradeWeight ?? 40}%
                  </span>
                </div>
                <div className="entry-actions">
                  <button
                    type="button"
                    className="entry-action"
                    onClick={() => handleEdit(subject)}
                  >
                    수정
                  </button>
                  <button
                    type="button"
                    className="entry-action entry-action-danger"
                    aria-label={`${subject.name} 삭제`}
                    onClick={() => handleRemove(subject)}
                  >
                    삭제
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </>
      ) : (
        <p className="empty-hint">
          아직 추가된 과목이 없어요. 위에서 과목을 추가해 주세요.
        </p>
      )}

      <button
        type="button"
        className="button button-orange"
        onClick={handleShowResult}
      >
        결과 확인
      </button>
    </section>
  );
}

export default SubjectInputPage;
