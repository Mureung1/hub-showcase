import { useState } from "react";
import "./HomePage.css";

// TODO: 실제 로그인 유저 이름으로 교체
const USER_NAME = "민지";

// TODO: 실제로는 백엔드 GET /api/today-doses 같은 API에서 받아와야 함 (더미 데이터)
const INITIAL_SCHEDULE = [
  {
    id: "morning",
    label: "08:00 · 아침",
    isCurrent: false,
    items: [
      { id: 1, name: "오메가3", taken: true },
      { id: 2, name: "비타민D", taken: true },
      { id: 3, name: "프로바이오틱스", taken: false },
    ],
  },
  {
    id: "lunch",
    label: "12:30 · 점심",
    isCurrent: false,
    empty: true,
    items: [],
  },
  {
    id: "dinner",
    label: "19:00 · 저녁",
    isCurrent: true,
    items: [{ id: 4, name: "오메가3", taken: false }],
  },
  {
    id: "bedtime",
    label: "22:00 · 취침 전",
    isCurrent: false,
    items: [{ id: 5, name: "마그네슘", taken: false }],
  },
];

const NAV_ITEMS = [
  { id: "today", label: "오늘의 복용" },
  { id: "cabinet", label: "캐비닛" },
  { id: "logs", label: "복용 기록" },
];

function HomePage() {
  const [activeNav, setActiveNav] = useState("today");
  const [schedule, setSchedule] = useState(INITIAL_SCHEDULE);

  const allItems = schedule.flatMap((slot) => slot.items);
  const takenCount = allItems.filter((item) => item.taken).length;
  const totalCount = allItems.length;
  const progressPercent = totalCount === 0 ? 0 : (takenCount / totalCount) * 100;

  function toggleItem(slotId, itemId) {
    setSchedule((prev) =>
      prev.map((slot) =>
        slot.id !== slotId
          ? slot
          : {
              ...slot,
              items: slot.items.map((item) =>
                item.id === itemId ? { ...item, taken: !item.taken } : item
              ),
            }
      )
    );
  }

  return (
    <div className="home-page">
      <aside className="home-sidebar">
        <div className="home-logo">필메이트</div>

        <nav className="home-nav">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`home-nav-item ${activeNav === item.id ? "active" : ""}`}
              onClick={() => setActiveNav(item.id)}
            >
              <span className="home-nav-dot" />
              {item.label}
            </button>
          ))}
        </nav>

        <button type="button" className="home-add-button">
          + 영양제 등록
        </button>
      </aside>

      <main className="home-main">
        <h1 className="home-greeting">{USER_NAME}님, 오늘도 잘 챙겨봐요</h1>
        <div className="home-date-row">
          <span className="home-date">7월 7일 월요일</span>
          <span className="home-progress-badge">
            {takenCount}/{totalCount} 완료
          </span>
        </div>

        <div className="home-progress-bar">
          <div className="home-progress-fill" style={{ width: `${progressPercent}%` }} />
        </div>

        <div className="home-timeline">
          {schedule.map((slot) => (
            <div className="home-timeline-row" key={slot.id}>
              <span
                className={`home-timeline-dot ${slot.isCurrent ? "current" : ""} ${
                  slot.items.length > 0 && slot.items.every((i) => i.taken) ? "done" : ""
                }`}
              />
              <div className={`home-slot-card ${slot.isCurrent ? "current" : ""}`}>
                <div className="home-slot-header">
                  <span>{slot.label}</span>
                  {slot.empty && <span className="home-slot-empty"> — 복용 없음</span>}
                  {slot.isCurrent && <span className="home-now-badge">지금</span>}
                </div>
                {slot.items.length > 0 && (
                  <div className="home-slot-items">
                    {slot.items.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        className={`home-item-pill ${item.taken ? "taken" : ""}`}
                        onClick={() => toggleItem(slot.id, item.id)}
                      >
                        <span className="home-item-checkbox">{item.taken ? "✓" : ""}</span>
                        {item.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}

export default HomePage;
