// screens/PreferenceScreen.jsx
import { useEffect, useState } from "react";
import "./PreferenceScreen.css";
import PrimaryButton from "../components/PrimaryButton";
import { fetchLectures } from "../api/lectures";
import { CURRENT_YEAR, CURRENT_SEMESTER } from "../config/semester";

const DAYS = ["월", "화", "수", "목", "금"];
const CREDIT_OPTIONS = [12, 15, 18, 21];

export default function PreferenceScreen({ onNavigate, onSubmit }) {
  const [grade, setGrade] = useState("2");
  const [department, setDepartment] = useState("컴퓨터학부");
  const [freeDays, setFreeDays] = useState([]);
  const [avoidMorning, setAvoidMorning] = useState(false);
  const [targetCredit, setTargetCredit] = useState(15);
  const [teamPreferred, setTeamPreferred] = useState(false);
  const [completedIds, setCompletedIds] = useState([]);
  const [freeText, setFreeText] = useState("");
  const [majorSubjects, setMajorSubjects] = useState([]);
  const [majorSubjectsError, setMajorSubjectsError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setMajorSubjectsError(false);
    fetchLectures({ year: CURRENT_YEAR, semester: CURRENT_SEMESTER, department })
      .then((lectures) => {
        if (!cancelled) setMajorSubjects(lectures);
      })
      .catch((err) => {
        console.error("강의 목록 조회 실패:", err);
        if (!cancelled) setMajorSubjectsError(true);
      });
    return () => {
      cancelled = true;
    };
  }, [department]);

  function toggleDay(day) {
    setFreeDays((prev) => (prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]));
  }

  function toggleCompleted(id) {
    setCompletedIds((prev) => (prev.includes(id) ? prev.filter((v) => v !== id) : [...prev, id]));
  }

  function handleSubmit(e) {
    e.preventDefault();
    onSubmit?.({
      grade: Number(grade),
      department,
      freeDays,
      avoidMorning,
      targetCredit,
      teamPreferred,
      completedIds,
      freeText,
    });
  }

  return (
    <form className="preference-screen" onSubmit={handleSubmit}>
      <div className="topbar">
        <button
          type="button"
          className="topbar__back"
          onClick={() => onNavigate?.("home")}
          aria-label="뒤로가기"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
        <h1 className="topbar__title">조건 입력</h1>
        <span className="topbar__spacer" aria-hidden="true" />
      </div>

      <p className="preference-screen__desc">
        아래 조건에 맞춰 시간표를 추천해드려요. 전공필수 과목은 조건과 무관하게 항상 포함됩니다.
      </p>

      <div className="field-list">
        <div className="field">
          <label htmlFor="pref-grade">학년</label>
          <select id="pref-grade" value={grade} onChange={(e) => setGrade(e.target.value)}>
            <option value="1">1학년</option>
            <option value="2">2학년</option>
            <option value="3">3학년</option>
            <option value="4">4학년</option>
          </select>
        </div>
        <div className="field">
          <label htmlFor="pref-department">학과</label>
          <select id="pref-department" value={department} onChange={(e) => setDepartment(e.target.value)}>
            <option value="컴퓨터학부">컴퓨터학부</option>
          </select>
        </div>
      </div>

      <div className="field-list">
        <div className="field">
          <label>공강 희망 요일 (복수 선택 가능)</label>
          <div className="chip-group">
            {DAYS.map((day) => (
              <button
                key={day}
                type="button"
                className={`chip${freeDays.includes(day) ? " chip--active" : ""}`}
                onClick={() => toggleDay(day)}
              >
                {day}
              </button>
            ))}
          </div>
        </div>

        <div className="field">
          <label>목표 총 이수학점</label>
          <div className="chip-group">
            {CREDIT_OPTIONS.map((c) => (
              <button
                key={c}
                type="button"
                className={`chip${targetCredit === c ? " chip--active" : ""}`}
                onClick={() => setTargetCredit(c)}
              >
                {c}학점
              </button>
            ))}
          </div>
        </div>

        <div className="field field--row">
          <div>
            <label>오전 수업 피하기</label>
            <p className="field__hint">켜면 오전 수업이 있는 강의는 후보에서 제외해요</p>
          </div>
          <button
            type="button"
            className={`switch${avoidMorning ? " switch--on" : ""}`}
            onClick={() => setAvoidMorning((v) => !v)}
            aria-pressed={avoidMorning}
          >
            <span className="switch__thumb" />
          </button>
        </div>

        <div className="field field--row">
          <div>
            <label>팀플 있는 수업 선호</label>
            <p className="field__hint">팀플 포함 강의를 우선적으로 추천해요</p>
          </div>
          <button
            type="button"
            className={`switch${teamPreferred ? " switch--on" : ""}`}
            onClick={() => setTeamPreferred((v) => !v)}
            aria-pressed={teamPreferred}
          >
            <span className="switch__thumb" />
          </button>
        </div>
      </div>

      <div className="field-list">
        <div className="field">
          <label>이미 들은 과목 (선수과목 확인용)</label>
          {majorSubjectsError && (
            <p className="field__hint">과목 목록을 불러오지 못했어요. 잠시 후 다시 시도해주세요.</p>
          )}
          <div className="checkbox-list">
            {majorSubjects.map((s) => (
              <label key={s.id} className="checkbox-item">
                <input
                  type="checkbox"
                  checked={completedIds.includes(s.id)}
                  onChange={() => toggleCompleted(s.id)}
                />
                <span>{s.name}</span>
              </label>
            ))}
          </div>
        </div>
      </div>

      <div className="field-list">
        <div className="field">
          <label htmlFor="pref-freetext">자유 텍스트 조건 (선택)</label>
          <textarea
            id="pref-freetext"
            placeholder="예: 수요일엔 오후 수업만 듣고 싶어요"
            value={freeText}
            onChange={(e) => setFreeText(e.target.value)}
            rows={3}
          />
        </div>
      </div>

      <PrimaryButton type="submit">추천 시간표 받기</PrimaryButton>
    </form>
  );
}
