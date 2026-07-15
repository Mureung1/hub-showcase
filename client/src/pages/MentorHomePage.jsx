import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import MentorApplicationCard from "../components/MentorApplicationCard";
import { mentorApplications } from "../data/mentorApplications";
import { routePaths } from "../routes/routePaths";
import { clearCurrentUserRole } from "../utils/authStorage";

const statusTabs = [
  { value: "pending", label: "대기" },
  { value: "confirmed", label: "확정" },
  { value: "completed", label: "완료" },
  { value: "rejected", label: "거부" },
];

function MentorHomePage() {
  const navigate = useNavigate();
  const [applications, setApplications] = useState(() => mentorApplications);
  const [activeStatus, setActiveStatus] = useState("pending");
  const filteredApplications = useMemo(
    () => applications.filter((application) => application.status === activeStatus),
    [activeStatus, applications],
  );

  const handleStatusChange = (applicationId, nextStatus) => {
    setApplications((currentApplications) =>
      currentApplications.map((application) =>
        application.id === applicationId
          ? { ...application, status: nextStatus }
          : application,
      ),
    );
    setActiveStatus(nextStatus);
  };

  const handleLogout = () => {
    clearCurrentUserRole();
    navigate(routePaths.landing, { replace: true });
  };

  return (
    <div className="mentor-home-page">
      <header className="page-header mentor-home-header">
        <div>
          <p className="eyebrow">MENTOR HOME</p>
          <h1 className="page-title">면담 신청 목록</h1>
        </div>
        <div className="mentor-home-header-actions">
          <Link className="button button-neutral" to={routePaths.mentorMyPage}>
            개인 정보
          </Link>
          <button className="button button-soft" onClick={handleLogout} type="button">
            로그아웃
          </button>
        </div>
      </header>

      <main className="page-container mentor-home-container">
        <nav className="mentor-status-tabs" aria-label="면담 신청 상태">
          {statusTabs.map((status) => {
            const count = applications.filter(
              (application) => application.status === status.value,
            ).length;
            const isActive = activeStatus === status.value;

            return (
              <button
                aria-current={isActive ? "page" : undefined}
                className={`mentor-status-tab${isActive ? " mentor-status-tab-active" : ""}`}
                key={status.value}
                onClick={() => setActiveStatus(status.value)}
                type="button"
              >
                <span>{status.label}</span>
                <strong>{count}</strong>
              </button>
            );
          })}
        </nav>

        <section className="mentor-application-list" aria-live="polite">
          <div className="mentor-list-heading">
            <div>
              <p className="eyebrow">{statusTabs.find((status) => status.value === activeStatus)?.label}</p>
              <h2>면담 신청 {filteredApplications.length}건</h2>
            </div>
            <p>신청자 정보와 사전 질문지를 확인해 주세요.</p>
          </div>

          <div className="stack">
            {filteredApplications.map((application) => (
              <MentorApplicationCard
                application={application}
                key={application.id}
                onStatusChange={handleStatusChange}
              />
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}

export default MentorHomePage;
