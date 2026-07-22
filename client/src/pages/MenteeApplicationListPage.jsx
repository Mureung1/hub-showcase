import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { getApplications } from "../api/applications";
import ApplicationCard from "../components/ApplicationCard";
import { routePaths } from "../routes/routePaths";

const MOCK_MENTEE_ID = "mentee-1";

function MenteeApplicationListPage() {
  const location = useLocation();
  const statusTabs = [
    { value: "pending", label: "대기" },
    { value: "confirmed", label: "확정" },
    { value: "completed", label: "완료" },
    { value: "rejected", label: "거부" },
  ];
  const [activeStatus, setActiveStatus] = useState(
    () => location.state?.activeStatus ?? "pending",
  );
  const [applications, setApplications] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let isCurrent = true;

    const loadApplications = async () => {
      setIsLoading(true);
      setErrorMessage("");

      try {
        const response = await getApplications({ mockUserId: MOCK_MENTEE_ID });
        if (isCurrent) setApplications(response.data);
      } catch (error) {
        if (isCurrent) setErrorMessage(error.message);
      } finally {
        if (isCurrent) setIsLoading(false);
      }
    };

    loadApplications();

    return () => {
      isCurrent = false;
    };
  }, []);

  const filteredApplications = useMemo(
    () => applications.filter((application) => application.status === activeStatus),
    [activeStatus, applications],
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

        <section className="mentee-application-list" aria-live="polite">
          {errorMessage && (
            <div className="mentee-applications-message mentee-applications-error" role="alert">
              {errorMessage}
            </div>
          )}

          {isLoading ? (
            <div className="card mentee-applications-message" role="status">
              면담 신청 목록을 불러오는 중입니다.
            </div>
          ) : filteredApplications.length > 0 ? (
            <div className="stack">
              {filteredApplications.map((application) => (
                <ApplicationCard application={application} key={application.id} />
              ))}
            </div>
          ) : (
            <div className="card mentee-applications-message">
              {statusTabs.find((status) => status.value === activeStatus)?.label} 상태의 신청이 없습니다.
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

export default MenteeApplicationListPage;
