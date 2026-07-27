import { useState } from "react";
import ScoreSelector from "./ScoreSelector";
import { getDaysUntil, formatDday } from "../utils/daysUntil";

const INITIAL_FORM = {
  name: "",
  examDate: "",
  understanding: 4,
  difficulty: 4,
  credits: 3,
  gradeWeight: 40,
  grading: 4,
  studyAmount: 4,
  availableTime: 4,
  // 선택 입력이라 빈 문자열이 기본값이다(값을 넣지 않으면 "해당 없음"으로 저장된다).
  previousScore: "",
};

// 각 1~7 단계가 무슨 뜻인지 알려주는 라벨. "4"가 사람마다 다른 문제를 줄인다.
const UNDERSTANDING_LEVELS = [
  "전혀 모름", "조금 앎", "약간 앎", "절반 정도", "꽤 앎", "잘 앎", "완벽",
];
const DIFFICULTY_LEVELS = [
  "매우 쉬움", "쉬움", "약간 쉬움", "보통", "약간 어려움", "어려움", "매우 어려움",
];
const GRADING_LEVELS = [
  "매우 후하게", "후하게", "약간 후하게", "보통", "약간 짠 편", "짠 편", "매우 짜게",
];
const STUDY_AMOUNT_LEVELS = [
  "아주 적음", "적음", "약간 적음", "보통", "약간 많음", "많음", "아주 많음",
];
const AVAILABLE_TIME_LEVELS = [
  "매우 부족", "부족", "약간 부족", "보통", "약간 넉넉", "넉넉", "충분",
];

// 목록에서 1~7 값을 보여줄 때, 0("모르겠다")은 "?"로 표시한다.
function formatScale(value) {
  return value >= 1 && value <= 7 ? value : "?";
}

function SubjectInputPage({
  subjects,
  onAddSubject,
  onUpdateSubject,
  onRemoveSubject,
  onCompleteSubject,
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

    const credits = Number(form.credits);
    if (form.credits === "" || !Number.isFinite(credits) || credits <= 0) {
      setErrorMessage("중요도(학점)는 0보다 큰 숫자로 입력해 주세요.");
      return;
    }

    // 이전 시험 점수는 선택 입력이라 비어 있으면 null(해당 없음)로 보낸다.
    let previousScore = null;
    if (form.previousScore !== "") {
      const parsed = Number(form.previousScore);
      if (!Number.isInteger(parsed) || parsed < 0 || parsed > 100) {
        setErrorMessage("이전 시험 점수는 0~100 사이로 입력해 주세요.");
        return;
      }
      previousScore = parsed;
    }

    const payload = {
      name,
      examDate: form.examDate,
      understanding: form.understanding,
      difficulty: form.difficulty,
      credits,
      gradeWeight,
      grading: form.grading,
      studyAmount: form.studyAmount,
      availableTime: form.availableTime,
      previousScore,
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
      credits: subject.credits ?? 3,
      gradeWeight: subject.gradeWeight ?? 40,
      grading: subject.grading ?? 4,
      studyAmount: subject.studyAmount ?? 4,
      availableTime: subject.availableTime ?? 4,
      previousScore:
        subject.previousScore === null || subject.previousScore === undefined
          ? ""
          : subject.previousScore,
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

  function handleComplete(subject) {
    if (editingId === subject.id) {
      resetForm();
    }
    onCompleteSubject(subject.id);
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
          <div className="form-section">
            <p className="form-section-title">기본 정보</p>

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
          </div>

          <div className="form-section">
            <p className="form-section-title">학습 상태</p>

            <ScoreSelector
              label="이해도"
              value={form.understanding}
              onChange={(value) => updateField("understanding", value)}
              levelLabels={UNDERSTANDING_LEVELS}
            />

            <div className="form-group">
              <label className="form-label" htmlFor="previousScore">
                이전 시험 점수 (선택)
              </label>
              <input
                id="previousScore"
                className="form-input"
                type="number"
                min="0"
                max="100"
                inputMode="numeric"
                placeholder="예: 85"
                value={form.previousScore}
                onChange={(event) => updateField("previousScore", event.target.value)}
              />
              <p className="form-hint">
                이 과목의 이전 시험 점수가 있으면 입력하세요. 높을수록 이미 잘하는
                과목으로 보고 우선순위를 낮춰요. 없으면 비워두세요.
              </p>
            </div>

            <ScoreSelector
              label="난이도"
              value={form.difficulty}
              onChange={(value) => updateField("difficulty", value)}
              levelLabels={DIFFICULTY_LEVELS}
            />

            <ScoreSelector
              label="공부 분량 (시험 범위)"
              value={form.studyAmount}
              onChange={(value) => updateField("studyAmount", value)}
              levelLabels={STUDY_AMOUNT_LEVELS}
            />

            <ScoreSelector
              label="확보 가능한 공부 시간"
              value={form.availableTime}
              onChange={(value) => updateField("availableTime", value)}
              levelLabels={AVAILABLE_TIME_LEVELS}
            />
          </div>

          <div className="form-section">
            <p className="form-section-title">성적 관련</p>

            <div className="form-group">
              <label className="form-label" htmlFor="credits">
                중요도 (학점 수)
              </label>
              <input
                id="credits"
                className="form-input"
                type="number"
                min="0.5"
                step="0.5"
                inputMode="decimal"
                value={form.credits}
                onChange={(event) => updateField("credits", event.target.value)}
              />
              <p className="form-hint">
                이 과목의 학점 수예요. 높을수록 최종 점수가 더 높게 반영돼요. 예: 3학점
              </p>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="gradeWeight">
                성적 반영 비율 (%)
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
          </div>

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
                    <span className="meta-chip meta-chip-dday">
                      {formatDday(getDaysUntil(subject.examDate))}
                    </span>
                    <span className="meta-chip">
                      이해도 {formatScale(subject.understanding)}
                    </span>
                    <span className="meta-chip">
                      난이도 {formatScale(subject.difficulty)}
                    </span>
                    <span className="meta-chip">{subject.credits ?? 3}학점</span>
                    <span className="meta-chip">
                      성적반영 {subject.gradeWeight ?? 40}%
                    </span>
                    {subject.previousScore !== null && subject.previousScore !== undefined && (
                      <span className="meta-chip">이전 시험 {subject.previousScore}점</span>
                    )}
                  </span>
                </div>
                <div className="entry-actions">
                  <button
                    type="button"
                    className="entry-action"
                    aria-label={`${subject.name} 완료`}
                    onClick={() => handleComplete(subject)}
                  >
                    완료
                  </button>
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
