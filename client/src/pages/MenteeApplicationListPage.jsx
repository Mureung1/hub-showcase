import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import ApplicationCard from "../components/ApplicationCard";
import { applications } from "../data/applications";
import { routePaths } from "../routes/routePaths";

function MenteeApplicationListPage() {
  const statusTabs = [
    { value: "pending", label: "대기" },
    { value: "confirmed", label: "확정" },
    { value: "completed", label: "완료" },
    { value: "rejected", label: "거부" },
  ];
  const [activeStatus, setActiveStatus] = useState("pending");
  const filteredApplications = useMemo(
    () => applications.filter((application) => application.status === activeStatus),
    [activeStatus],
  );

  return (
    <div className="mentee-applications-page">
      <header className="page-header mentee-applications-header">
        <div>
          <p className="eyebrow">MENTEE APPLICATIONS</p>
          <h1 className="page-title">면담 신청 목록</h1>
        </div>
        <Link className="button button-soft" to={routePaths.menteeMentors}>
          멘토 프로필 목록으로
        </Link>
      </header>

      <main className="page-container mentee-applications-container">
        <div className="application-status-tabs" role="tablist" aria-label="신청 상태">
          {statusTabs.map((status) => {
            const count = applications.filter((application) => application.status === status.value).length;
            const isActive = activeStatus === status.value;

            return (
              <button
                aria-selected={isActive}
                className={`application-status-tab${isActive ? " application-status-tab-active" : ""}`}
                key={status.value}
                onClick={() => setActiveStatus(status.value)}
                role="tab"
                type="button"
              >
                {status.label} <span>{count}</span>
              </button>
            );
          })}
        </div>

        <section className="stack" aria-live="polite">
          {filteredApplications.map((application) => (
            <ApplicationCard application={application} key={application.id} />
          ))}
        </section>
      </main>
    </div>
  );
}

export default MenteeApplicationListPage;
