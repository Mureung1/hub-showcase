import { useRef, useState } from "react";
import { getDaysUntil, formatDday } from "../utils/daysUntil";

// 1단계. 사용자가 확실히 아는 두 가지(과목명, 시험 날짜)만 받는다.
// 나머지를 여기서 같이 물으면 결과를 한 번 보기까지 과목당 10번을 답해야 한다.
function CollectStep({ subjects, onAddSubject, onRemoveSubject, onNext }) {
  const [name, setName] = useState("");
  const [examDate, setExamDate] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const nameInputRef = useRef(null);

  const daysUntilForm = examDate ? getDaysUntil(examDate) : null;
  // 날짜만 알아도 임박도로 점수가 나온다. 담자마자 순서를 보여줘 다음 단계 전에 이미 쓸모가 있게 한다.
  const previewOrder = [...subjects].sort((a, b) => b.priorityScore - a.priorityScore);

  function handleSubmit(event) {
    event.preventDefault();

    const trimmed = name.trim();

    if (trimmed === "") {
      setErrorMessage("과목명을 입력해 주세요.");
      nameInputRef.current?.focus();
      return;
    }

    if (examDate === "") {
      setErrorMessage("시험 날짜를 선택해 주세요.");
      return;
    }

    const isDuplicate = subjects.some(
      (subject) => subject.name.trim().toLowerCase() === trimmed.toLowerCase()
    );
    if (isDuplicate) {
      setErrorMessage("이미 담은 과목이에요.");
      nameInputRef.current?.focus();
      return;
    }

    onAddSubject({ name: trimmed, examDate });
    setName("");
    setExamDate("");
    setErrorMessage("");
    // 과목을 여러 개 담는 게 보통이라, 담고 나면 바로 다음 과목을 칠 수 있게 둔다.
    nameInputRef.current?.focus();
  }

  function clearError() {
    if (errorMessage !== "") {
      setErrorMessage("");
    }
  }

  return (
    <section>
      <form className="card" onSubmit={handleSubmit}>
        <h2 className="section-title">어떤 과목을 준비하나요?</h2>
        {/* 이 화면에 칸이 두 개뿐이라, 나머지 항목이 없어진 것처럼 보인다.
            어디서 채울 수 있는지 이름을 그대로 적어준다. */}
        <p className="card-lead">
          지금 확실히 아는 것만 적으면 돼요. 이해도·난이도·공부 분량·학점·성적 반영 비율은
          다음 단계에서 채울 수 있어요.
        </p>

        <div className="form-stack">
          <div className="form-group">
            <label className="form-label" htmlFor="subjectName">
              과목명
            </label>
            <input
              id="subjectName"
              ref={nameInputRef}
              className={`form-input${errorMessage ? " has-error" : ""}`}
              type="text"
              placeholder="예: 한방병리학"
              value={name}
              onChange={(event) => {
                setName(event.target.value);
                clearError();
              }}
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
              value={examDate}
              onChange={(event) => {
                setExamDate(event.target.value);
                clearError();
              }}
            />
            {daysUntilForm !== null && (
              <p className={`form-hint${daysUntilForm < 0 ? " is-warning" : ""}`}>
                {daysUntilForm < 0
                  ? `이미 지난 날짜예요 (${formatDday(daysUntilForm)})`
                  : formatDday(daysUntilForm)}
              </p>
            )}
          </div>

          {/* 자리를 미리 잡아둬서 메시지가 떠도 아래 버튼이 밀리지 않는다. */}
          <p className="form-error" role="alert">
            {errorMessage}
          </p>

          <button type="submit" className="button button-secondary">
            + 담기
          </button>
        </div>
      </form>

      {subjects.length > 0 ? (
        <>
          <h3 className="subsection-title">담은 과목 ({subjects.length})</h3>

          <ul className="entry-list">
            {subjects.map((subject) => (
              <li key={subject.id} className="entry-item">
                <div className="entry-main">
                  <span className="entry-name">{subject.name}</span>
                  <span className="entry-meta">
                    <span className="meta-chip meta-chip-dday">
                      {formatDday(getDaysUntil(subject.examDate))}
                    </span>
                  </span>
                </div>
                <div className="entry-actions">
                  <button
                    type="button"
                    className="entry-action entry-action-danger"
                    aria-label={`${subject.name} 빼기`}
                    onClick={() => onRemoveSubject(subject.id)}
                  >
                    빼기
                  </button>
                </div>
              </li>
            ))}
          </ul>

          {previewOrder.length > 1 && (
            <p className="order-preview">
              시험 날짜만으로 본 지금 순서:{" "}
              {previewOrder.map((subject, index) => (
                <span key={subject.id}>
                  {index > 0 && " → "}
                  <b>{subject.name}</b>
                </span>
              ))}
            </p>
          )}
        </>
      ) : (
        <p className="empty-hint">
          아직 담은 과목이 없어요. 위에서 과목을 담아 주세요.
        </p>
      )}

      <button
        type="button"
        className="button button-primary"
        disabled={subjects.length === 0}
        aria-describedby={subjects.length === 0 ? "next-disabled-hint" : undefined}
        onClick={onNext}
      >
        다음: 분량·이해도 알려주기
      </button>
      {subjects.length === 0 && (
        <p id="next-disabled-hint" className="button-hint">
          과목을 한 개 이상 담으면 다음으로 넘어갈 수 있어요.
        </p>
      )}
    </section>
  );
}

export default CollectStep;
