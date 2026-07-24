import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getEvents } from "../../api/analysisApi";
import { calculateDDay, formatDDay, isValidDeadline } from "../../utils/dday";
import "./DashboardPage.css";

function DashboardPage() {
  const navigate = useNavigate();
  const [events, setEvents] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchEvents() {
      setIsLoading(true);
      setError("");
      try {
        const response = await getEvents();
        setEvents(response.data || []);
      } catch (err) {
        setError(err.message);
        setEvents([]);
      } finally {
        setIsLoading(false);
      }
    }

    fetchEvents();
  }, []);

  function getUrgencyClass(daysUntil) {
    if (daysUntil === 0 || daysUntil === 1) return "urgent";
    if (daysUntil <= 3) return "warning";
    if (daysUntil <= 7) return "upcoming";
    return "normal";
  }

  function getUpcomingDeadlines() {
    return events
      .filter((event) => event.deadline && isValidDeadline(event.deadline))
      .map((event) => ({
        ...event,
        daysUntil: calculateDDay(event.deadline),
      }))
      .filter((event) => event.daysUntil !== null)
      .sort((a, b) => a.daysUntil - b.daysUntil)
      .slice(0, 5);
  }

  const upcomingDeadlines = getUpcomingDeadlines();

  return (
    <section className="dashboard-section">
      <div className="dashboard-container">
        <h2 className="dashboard-greeting">안녕하세요! 오늘도 일정을 확인해볼까요?</h2>

        <div className="dashboard-content">
          <div className="upcoming-section">
            <h3>다가오는 마감</h3>

            {isLoading && <p className="status-message">일정을 불러오는 중...</p>}

            {error && <p className="error-message">오류: {error}</p>}

            {!isLoading && !error && upcomingDeadlines.length === 0 && (
              <p className="empty-message">
                {events.length === 0
                  ? "저장된 일정이 없습니다."
                  : "마감 일정이 없습니다."}
              </p>
            )}

            {!isLoading && !error && upcomingDeadlines.length > 0 && (
              <div className="events-list">
                {upcomingDeadlines.map((event) => (
                  <div key={event.id} className={`event-card ${getUrgencyClass(event.daysUntil)}`}>
                    <div className="event-info">
                      <p className="event-name">{event.name}</p>
                      <p className="event-date">{event.deadline}</p>
                    </div>
                    <div
                      className={`event-badge badge-${
                        event.daysUntil === 0 ? "today" : event.daysUntil === 1 ? "tomorrow" : "future"
                      }`}
                    >
                      {formatDDay(event.daysUntil)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="dashboard-actions">
            <button
              className="action-button primary-button"
              onClick={() => navigate("/register-event")}
            >
              📝 일정 등록
            </button>
            <button
              className="action-button secondary-button"
              onClick={() => navigate("/calendar")}
            >
              📅 전체 일정 보기
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

export default DashboardPage;
