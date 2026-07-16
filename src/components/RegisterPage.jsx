import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { addDays, setHours, setMinutes, setSeconds, setMilliseconds } from "date-fns";
import { apiFetch } from "../lib/api";
import "./RegisterPage.css";

// 유형 9종 — select의 옵션으로 매핑할 것이므로 컴포넌트 밖 상수로 둔다.
// (컴포넌트 안에 두면 매 렌더링마다 새 배열이 만들어져서 불필요한 재생성이 생긴다.)
const TYPE_OPTIONS = [
  "리포트/글쓰기",
  "문제풀이/암기",
  "발표/PT 준비",
  "코딩 실습",
  "시험공부",
  "프로젝트",
  "조별과제",
  "개인공부",
  "기타",
];

// 회피 이유 4종 — value는 DB/로직에서 쓸 영문 키, label은 화면에 보여줄 한글 문구.
// { value, label } 형태로 두면 <option value={value}>{label}</option>로 바로 매핑 가능.
const REASON_OPTIONS = [
  { value: "overwhelm", label: "막막해서 못 시작" },
  { value: "dislike", label: "이 할일 자체가 하기 싫음" },
  { value: "temptation", label: "눈앞의 유혹(놀고 싶음)" },
  { value: "custom", label: "기타(직접입력)" },
];

function RegisterPage() {
  const navigate = useNavigate(); // 제출 성공 후 코드로 페이지 이동시키기 위해 받아둠

  // 필드마다 독립된 useState. 각 onChange는 딱 이 하나의 state만 건드린다.
  const [title, setTitle] = useState(""); // 제목 — 텍스트 입력
  const [type, setType] = useState(TYPE_OPTIONS[0]); // 유형 — select, 기본값은 첫 옵션
  const [startTime, setStartTime] = useState(""); // 시작 예정 시각 — <input type="time">의 "HH:MM" 문자열
  const [deadline, setDeadline] = useState(""); // 마감까지 D-day — 숫자를 문자열로 들고 있다가 제출 시 다룬다
  const [reason, setReason] = useState(REASON_OPTIONS[0].value); // 회피 이유 — select, 기본값은 첫 옵션의 value
  const [customText, setCustomText] = useState(""); // reason이 "custom"일 때만 쓰는 자유 입력

  async function handleSubmit(e) {
    e.preventDefault(); // form 기본 제출 동작(새로고침) 막기

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
  }

  return (
    <div className="page page-form">
      <div className="page-header">
        <h1 className="page-title">할일 등록</h1>
        <p className="page-sub">한 번에 하나씩, 필요한 정보만 입력해주세요.</p>
      </div>

      <div className="form-card">
        <form className="register-form" onSubmit={handleSubmit}>
          <div className="field">
            <label className="field-label" htmlFor="title">
              제목
            </label>
            <input
              className="field-input"
              id="title"
              type="text"
              value={title}
              // e.target.value만 꺼내서 이 필드의 setter에만 넘긴다 — 다른 state는 건드리지 않는다
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div className="field">
            <label className="field-label" htmlFor="type">
              할일 유형
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

          <div className="field-row">
            <div className="field">
              <label className="field-label" htmlFor="startTime">
                시작 예정 시각
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
                className="field-input"
                id="deadline"
                type="number"
                min="0"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
              />
            </div>
          </div>

          <div className="field">
            <label className="field-label" htmlFor="reason">
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

          <button className="btn btn-primary btn-block" type="submit">
            등록하고 홈으로
          </button>
        </form>
      </div>
    </div>
  );
}

export default RegisterPage;
