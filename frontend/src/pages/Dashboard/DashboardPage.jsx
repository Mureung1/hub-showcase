import { useNavigate } from "react-router-dom";
import "./DashboardPage.css";

function DashboardPage() {
  const navigate = useNavigate();

  return (
    <section className="dashboard-section">
      <div className="dashboard-container">
        <h2>CalMe</h2>
        <p className="dashboard-subtitle">일정 관리 서비스</p>

        <div className="dashboard-content">
          <div className="upcoming-section">
            <h3>다가오는 마감</h3>
            <p className="empty-message">마감 일정이 없습니다.</p>
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
              📅 캘린더
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

export default DashboardPage;
