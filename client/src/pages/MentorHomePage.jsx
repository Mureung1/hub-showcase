import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  acceptApplication,
  getApplications,
  rejectApplication,
} from "../api/applications";
import { markMessagesAsRead } from "../api/messages";
import MentorApplicationCard from "../components/MentorApplicationCard";
import { useAuth } from "../context/AuthContext";
import useUnreadMessageRealtime from "../hooks/useUnreadMessageRealtime";
import { routePaths } from "../routes/routePaths";

const statusTabs = [
  { value: "pending", label: "대기" },
  { value: "confirmed", label: "확정" },
  { value: "completed", label: "완료" },
  { value: "rejected", label: "거부" },
];

function MentorHomePage() {
  const navigate = useNavigate();
  const { currentUser, logout } = useAuth();
  const [applications, setApplications] = useState([]);
  const [activeStatus, setActiveStatus] = useState("pending");
  const [isLoading, setIsLoading] = useState(true);
  const [acceptingApplicationId, setAcceptingApplicationId] = useState(null);
  const [rejectingApplicationId, setRejectingApplicationId] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [openChatApplicationId, setOpenChatApplicationId] = useState(null);

  const loadApplications = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage("");

    try {
      const response = await getApplications();
      setApplications(response.data);
      return true;
    } catch (error) {
      setErrorMessage(error.message);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadApplications();
  }, [loadApplications]);

  const filteredApplications = useMemo(
    () => applications.filter(
      (application) => application.mentorStatus === activeStatus,
    ),
    [activeStatus, applications],
  );

  const handleAccept = async (applicationId) => {
    setAcceptingApplicationId(applicationId);
    setErrorMessage("");

    try {
      await acceptApplication({ applicationId });
      const hasReloaded = await loadApplications();
      if (hasReloaded) setActiveStatus("confirmed");
    } catch (error) {
      setErrorMessage(error.message);
    } finally {
      setAcceptingApplicationId(null);
    }
  };

  const handleReject = async (applicationId) => {
    setRejectingApplicationId(applicationId);
    setErrorMessage("");

    try {
      await rejectApplication({ applicationId });
      const hasReloaded = await loadApplications();
      if (hasReloaded) setActiveStatus("rejected");
    } catch (error) {
      setErrorMessage(error.message);
    } finally {
      setRejectingApplicationId(null);
    }
  };

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

  const handleLogout = async () => {
    await logout();
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
              (application) => application.mentorStatus === status.value,
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

          {errorMessage && (
            <div className="mentor-home-message mentor-home-error" role="alert">
              {errorMessage}
            </div>
          )}

          {isLoading ? (
            <div className="card mentor-home-message" role="status">
              면담 신청 목록을 불러오는 중입니다.
            </div>
          ) : filteredApplications.length > 0 ? (
            <div className="stack">
              {filteredApplications.map((application) => (
                <MentorApplicationCard
                  application={application}
                  isAccepting={acceptingApplicationId === application.id}
                  isChatOpen={openChatApplicationId === application.id}
                  isRejecting={rejectingApplicationId === application.id}
                  key={application.id}
                  onAccept={handleAccept}
                  onCloseChat={handleCloseChat}
                  onMeetingUpdated={handleMeetingUpdated}
                  onOpenChat={handleOpenChat}
                  onReject={handleReject}
                />
              ))}
            </div>
          ) : (
            <div className="card mentor-home-message">
              {statusTabs.find((status) => status.value === activeStatus)?.label} 상태의 신청이 없습니다.
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

export default MentorHomePage;
