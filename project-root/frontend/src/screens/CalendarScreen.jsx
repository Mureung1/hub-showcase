// screens/CalendarScreen.jsx
import "./CalendarScreen.css";
import PrimaryButton from "../components/PrimaryButton";
import Badge from "../components/Badge";
import TimeTableGrid from "../components/TimeTableGrid";

const CATEGORY_ORDER = ["전공필수", "전공선택", "교양"];

function summarizeByCategory(lectures) {
  const counts = new Map();
  for (const lec of lectures) {
    counts.set(lec.category, (counts.get(lec.category) ?? 0) + 1);
  }
  return CATEGORY_ORDER.filter((c) => counts.has(c)).map((c) => ({
    category: c,
    count: counts.get(c),
  }));
}

function formatTimes(times) {
  return times.map((t) => `${t.day} ${t.start}-${t.end}`).join(", ");
}

export default function CalendarScreen({ confirmedSchedule, onNavigate }) {
  const topbar = (
    <div className="topbar">
      <span className="topbar__spacer" aria-hidden="true" />
      <h1 className="topbar__title">내 시간표</h1>
      <span className="topbar__spacer" aria-hidden="true" />
    </div>
  );

  if (!confirmedSchedule) {
    return (
      <div className="calendar-screen">
        {topbar}
        <div className="calendar-screen__empty">
          <p className="calendar-screen__empty-title">아직 확정한 시간표가 없어요</p>
          <p className="calendar-screen__empty-desc">
            조건을 입력하고 추천받은 시간표 중 하나를 선택하면 여기에서 확인할 수 있어요.
          </p>
          <PrimaryButton onClick={() => onNavigate?.("preference")}>
            시간표 추천받으러 가기
          </PrimaryButton>
        </div>
      </div>
    );
  }

  const lectures = confirmedSchedule.lectures;
  const totalCredit = lectures.reduce((sum, l) => sum + l.credit, 0);
  const categorySummary = summarizeByCategory(lectures);

  return (
    <div className="calendar-screen">
      {topbar}

      <div className="schedule-summary">
        <p className="schedule-summary__title">{confirmedSchedule.selectedLabel}</p>
        <div className="schedule-summary__badges">
          <Badge variant="success">총 {totalCredit}학점</Badge>
          {categorySummary.map(({ category, count }) => (
            <Badge key={category}>
              {category} {count}개
            </Badge>
          ))}
        </div>
      </div>

      <div className="calendar-screen__grid-wrap">
        <TimeTableGrid lectures={lectures} />
      </div>

      <div className="lecture-list">
        <p className="lecture-list__title">과목 목록</p>
        {lectures.map((lec) => (
          <div key={lec.id} className="lecture-row">
            <div className="lecture-row__main">
              <span className="lecture-row__name">{lec.name}</span>
              <span className="lecture-row__meta">
                {lec.professor} · {lec.credit}학점
              </span>
            </div>
            <div className="lecture-row__side">
              <Badge>{lec.category}</Badge>
              <span className="lecture-row__time">{formatTimes(lec.times)}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
