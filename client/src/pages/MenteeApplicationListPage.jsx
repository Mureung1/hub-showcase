import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { getApplications } from "../api/applications";
import { markMessagesAsRead } from "../api/messages";
import ApplicationCard from "../components/ApplicationCard";
import { useAuth } from "../context/AuthContext";
import useUnreadMessageRealtime from "../hooks/useUnreadMessageRealtime";
import { routePaths } from "../routes/routePaths";

function MenteeApplicationListPage() {
  const location = useLocation();
  const { currentUser } = useAuth();
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
  const [openChatApplicationId, setOpenChatApplicationId] = useState(null);

  useEffect(() => {
    let isCurrent = true;

    const loadApplications = async () => {
      setIsLoading(true);
      setErrorMessage("");

      try {
        const response = await getApplications();
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

  const handleMeetingUpdated = (applicationId, updatedMeeting) => {
    setApplications((currentApplications) =>
      currentApplications.map((application) =>
        application.id === applicationId
          ? { ...application, meeting: updatedMeeting }
          : application));
  };

  const clearUnreadCount = (applicationId) => {
    setApplications((currentApplications) =>
      currentApplications.map((application) =>
        application.id === applicationId
          ? { ...application, unreadMessageCount: 0 }
          : application));
  };

  const handleOpenChat = (applicationId) => {
    setOpenChatApplicationId(applicationId);
    clearUnreadCount(applicationId);
    markMessagesAsRead({ applicationId }).catch(() => {});
  };

  const handleCloseChat = (applicationId) => {
    setOpenChatApplicationId(null);
    clearUnreadCount(applicationId);
    markMessagesAsRead({ applicationId }).catch(() => {});
  };

  const handleUnreadMessage = useCallback((applicationId) => {
    setApplications((currentApplications) =>
      currentApplications.map((application) =>
        application.id === applicationId
          ? { ...application, unreadMessageCount: (application.unreadMessageCount ?? 0) + 1 }
          : application));
  }, []);

  useUnreadMessageRealtime({
    currentUserId: currentUser?.id,
    openApplicationId: openChatApplicationId,
    onUnreadMessage: handleUnreadMessage,
  });

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
          <div className="mentee-list-heading">
            <div>
              <p className="eyebrow">{statusTabs.find((status) => status.value === activeStatus)?.label}</p>
              <h2>면담 신청 {filteredApplications.length}건</h2>
            </div>
          </div>

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
                <ApplicationCard
                  application={application}
                  isChatOpen={openChatApplicationId === application.id}
                  key={application.id}
                  onCloseChat={handleCloseChat}
                  onMeetingUpdated={handleMeetingUpdated}
                  onOpenChat={handleOpenChat}
                />
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
