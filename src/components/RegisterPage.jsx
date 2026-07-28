import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { addDays, setHours, setMinutes, setSeconds, setMilliseconds } from "date-fns";
import { apiFetch } from "../lib/api";
import { TYPE_OPTIONS, REASON_OPTIONS } from "../lib/taskOptions";
import { validateTaskTitle } from "../lib/taskTitle";
import { validateDeadline } from "../lib/validateDeadline";
import nagbotLanding from "../assets/characters/nagbot_landing.png";
import "./RegisterPage.css";

function RegisterPage() {
  const navigate = useNavigate(); // 제출 성공 후 코드로 페이지 이동시키기 위해 받아둠

  // 필드마다 독립된 useState. 각 onChange는 딱 이 하나의 state만 건드린다.
  const [title, setTitle] = useState(""); // 제목 — 텍스트 입력
  const [type, setType] = useState(TYPE_OPTIONS[0]); // 유형 — select, 기본값은 첫 옵션
  const [startTime, setStartTime] = useState(""); // 시작 예정 시각 — <input type="time">의 "HH:MM" 문자열
  const [deadline, setDeadline] = useState(""); // 마감까지 D-day — 숫자를 문자열로 들고 있다가 제출 시 다룬다
  const [reason, setReason] = useState(REASON_OPTIONS[0].value); // 회피 이유 — select, 기본값은 첫 옵션의 value
  const [customText, setCustomText] = useState(""); // reason이 "custom"일 때만 쓰는 자유 입력
  const [errorMessage, setErrorMessage] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submitInFlightRef = useRef(false);
  const titleInputRef = useRef(null);
  const deadlineInputRef = useRef(null);

  async function handleSubmit(e) {
    e.preventDefault(); // form 기본 제출 동작(새로고침) 막기

    if (!validateTaskTitle(title)) {
      setErrorMessage("제목을 입력해주세요.");
      titleInputRef.current?.focus();
      return;
    }

    if (!validateDeadline(deadline)) {
      setErrorMessage("마감까지 D-day를 입력해주세요.");
      deadlineInputRef.current?.focus();
      return;
    }

    if (submitInFlightRef.current) return;
    submitInFlightRef.current = true;
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      // startTime(<input type="time">의 "HH:MM")은 시:분만 갖고 있으므로
      // 오늘 날짜와 합쳐 완전한 datetime으로 만든다 — 서버/DB는 항상 완전한
      // datetime 문자열만 주고받는다는 컨벤션(CLAUDE.md)을 지키기 위함.
      // 값을 비운 채 제출하면(선택 입력 취급) 지금 시각을 시작 예정 시각으로 대체한다.
      const startAt = startTime
        ? (() => {
            const [hours, minutes] = startTime.split(":").map(Number);
            return setMilliseconds(
              setSeconds(setMinutes(setHours(new Date(), hours), minutes), 0),
              0,
            );
          })()
        : new Date();

      // deadline은 "오늘로부터 며칠 뒤"라는 D-day 숫자이므로, 오늘 날짜에
      // 그만큼 더해 실제 마감 날짜로 변환한다.
      const deadlineAt = addDays(new Date(), Number(deadline));

      const payload = {
        title,
        type,
        startTime: startAt.toISOString(),
        deadline: deadlineAt.toISOString(),
        reason,
        customText,
      };

      await apiFetch("/api/tasks", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      // 제출 성공 후 홈 페이지로 이동
      navigate("/home");
    } catch (err) {
      console.error(err);
      setErrorMessage("할일 등록에 실패했어요. 다시 시도해주세요.");
    } finally {
      submitInFlightRef.current = false;
      setIsSubmitting(false);
    }
  }

  const titleError = errorMessage === "제목을 입력해주세요.";
  const deadlineError = errorMessage === "마감까지 D-day를 입력해주세요.";
  const hasFieldError = titleError || deadlineError;

  return (
    <div className="page page-form">
      <div className="page-header register-header">
        <div className="register-header-copy">
          <h1 className="page-title">할 일 등록</h1>
          <p className="page-sub">필요한 정보만 입력해 주세요.</p>
        </div>
      </div>

      <div className="register-layout">
        <div className="form-card register-form-card">
          <form className="register-form" onSubmit={handleSubmit} noValidate>
            <section className="register-section register-section-intro">
              <div className="field">
                <label className="field-label" htmlFor="title">
                  제목
                </label>
                <input
                  ref={titleInputRef}
                  className="field-input"
                  id="title"
                  type="text"
                  placeholder="예: 자료구조 과제 제출하기"
                  value={title}
                  aria-invalid={titleError}
                  aria-describedby={titleError ? "register-title-error" : undefined}
                  // e.target.value만 꺼내서 이 필드의 setter에만 넘긴다 — 다른 state는 건드리지 않는다
                  onChange={(e) => setTitle(e.target.value)}
                />
                {titleError && (
                  <p className="register-inline-error" id="register-title-error" role="alert">
                    {errorMessage}
                  </p>
                )}
              </div>

              <div className="field">
                <label className="field-label" htmlFor="type">
                  할 일 유형
                </label>
                <select
                  className="field-input"
                  id="type"
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                >
                  {/* TYPE_OPTIONS 배열을 그대로 매핑 — 새 유형이 추가되면 배열만 고치면 된다 */}
                  {TYPE_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>
            </section>

            <section className="register-section" aria-labelledby="register-section-schedule">
              <h2 className="register-section-title" id="register-section-schedule">
                일정
              </h2>

              <div className="field-row">
                <div className="field">
                  <label className="field-label" htmlFor="startTime">
                    시작 예정 시간 (선택)
                  </label>
                  <input
                    className="field-input"
                    id="startTime"
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                  />
                  <p className="field-hint">비워두면 지금부터 바로 시작돼요.</p>
                </div>

                <div className="field">
                  <label className="field-label" htmlFor="deadline">
                    마감까지 D-day
                  </label>
                  <input
                    ref={deadlineInputRef}
                    className="field-input"
                    id="deadline"
                    type="number"
                    min="0"
                    placeholder="예: 3"
                    value={deadline}
                    aria-invalid={deadlineError}
                    aria-describedby={deadlineError ? "register-deadline-error" : undefined}
                    onChange={(e) => setDeadline(e.target.value)}
                  />
                  {deadlineError && (
                    <p
                      className="register-inline-error"
                      id="register-deadline-error"
                      role="alert"
                    >
                      {errorMessage}
                    </p>
                  )}
                </div>
              </div>
            </section>

            <section className="register-section" aria-labelledby="register-section-reason">
              <h2 className="register-section-title" id="register-section-reason">
                예상되는 회피 이유
              </h2>

              <div className="field">
                <label className="sr-only" htmlFor="reason">
                  예상되는 회피 이유
                </label>
                <select
                  className="field-input"
                  id="reason"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                >
                  {REASON_OPTIONS.map(({ value, label }) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>

              {/* reason이 "custom"일 때만 렌더링 — 조건이 false면 이 블록 자체가 DOM에 없다 */}
              {reason === "custom" && (
                <div className="field">
                  <label className="field-label" htmlFor="customText">
                    회피 이유 직접 입력
                  </label>
                  <input
                    className="field-input"
                    id="customText"
                    type="text"
                    placeholder="예: 완벽하게 하고 싶어서"
                    value={customText}
                    onChange={(e) => setCustomText(e.target.value)}
                  />
                </div>
              )}
            </section>

            {!hasFieldError && errorMessage && (
              <div className="register-error" role="alert" aria-live="assertive">
                {errorMessage}
              </div>
            )}

            <button
              className="btn btn-primary btn-block register-submit"
              type="submit"
              disabled={isSubmitting}
              aria-busy={isSubmitting}
            >
              {isSubmitting ? "등록 중..." : "할 일 등록하기"}
            </button>
          </form>
        </div>

        <aside className="register-aside" aria-hidden="true">
          <div className="register-aside-panel">
            <img className="register-aside-character" src={nagbotLanding} alt="" />
            <p className="register-aside-note">간단하게 입력해도 괜찮아요.</p>
          </div>
        </aside>
      </div>
    </div>
  );
}

export default RegisterPage;
