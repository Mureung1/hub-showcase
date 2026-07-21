import { Link } from "react-router-dom";
import { ROUTES } from "../shared/routes";

const calendarDays = [
  { day: "29", label: "", tone: "muted" },
  { day: "30", label: "", tone: "muted" },
  { day: "1", label: "내 근무", tone: "shift" },
  { day: "2", label: "", tone: "" },
  { day: "3", label: "3명 근무", tone: "store" },
  { day: "4", label: "", tone: "" },
  { day: "5", label: "내 근무", tone: "shift" },
  { day: "6", label: "마감", tone: "store" },
  { day: "7", label: "내 근무", tone: "today shift" },
  { day: "8", label: "", tone: "" },
  { day: "9", label: "요청 2건", tone: "request" },
  { day: "10", label: "내 근무", tone: "shift" },
  { day: "11", label: "", tone: "" },
  { day: "12", label: "오픈", tone: "store" }
];

const weekdays = ["일", "월", "화", "수", "목", "금", "토"];

export function WorkerDashboardPage() {
  return (
    <main className="dashboard">
      <section className="hero-row" aria-labelledby="dashboard-title">
        <div>
          <p className="kicker">WORKER DASHBOARD</p>
          <h1 id="dashboard-title">선택 매장 근무표</h1>
        </div>
        <div className="search-box">
          <span aria-hidden="true" />
          <p>근무, 요청, 알림 검색</p>
        </div>
      </section>

      <section className="metric-grid" aria-label="이번 달 요약">
        <article className="metric-card">
          <span>이번 달 근무</span>
          <strong>12회</strong>
          <p>48시간 예정</p>
        </article>
        <article className="metric-card">
          <span>예상 급여</span>
          <strong>528,000원</strong>
          <p>시급 11,000원</p>
        </article>
        <article className="metric-card highlight">
          <span>공개 요청</span>
          <strong>2건</strong>
          <p>신청 가능한 요청</p>
        </article>
      </section>

      <section className="content-grid">
        <section className="calendar-card" aria-label="월간 근무표">
          <div className="card-head">
            <div>
              <p className="label">MONTHLY SCHEDULE</p>
              <h2>2026년 7월</h2>
            </div>
            <div className="month-pills">
              <span>이전</span>
              <strong>오늘</strong>
              <span>다음</span>
            </div>
          </div>

          <div className="calendar-grid">
            {weekdays.map((weekday) => (
              <span className="weekday" key={weekday}>
                {weekday}
              </span>
            ))}

            {calendarDays.map(({ day, label, tone }) => (
              <div className={`day ${tone}`.trim()} key={`${day}-${label}`}>
                <strong>{day}</strong>
                {label ? <span>{label}</span> : null}
              </div>
            ))}
          </div>
        </section>

        <aside className="side-stack" aria-label="근무 요약">
          <section className="side-card today-card">
            <p className="label">TODAY</p>
            <h2>18:00 - 22:00</h2>
            <span>마감 · 4시간 · 40,000원</span>
            <div className="mini-people">
              <strong>김민지</strong>
              <strong>서준</strong>
              <strong>하은</strong>
            </div>
          </section>

          <section className="side-card">
            <div className="card-head compact">
              <h3>공개 요청</h3>
              <Link to={ROUTES.substituteRequests}>전체</Link>
            </div>
            <div className="request-list">
              <article>
                <div>
                  <strong>7월 9일 목</strong>
                  <span>19:00 - 23:00</span>
                </div>
                <p className="badge">대기</p>
              </article>
              <article>
                <div>
                  <strong>7월 10일 금</strong>
                  <span>17:00 - 22:00</span>
                </div>
                <p className="badge">승인 대기</p>
              </article>
            </div>
          </section>
        </aside>
      </section>
    </main>
  );
}
