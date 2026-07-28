import { format } from "date-fns";
import { useMarkNotificationAsRead, useNotifications } from "../features/notification";
import { StatusNotice } from "../shared/components";

function getNotificationTimeLabel(createdAt: string) {
  return format(new Date(createdAt), "M월 d일 HH:mm");
}

export function NotificationsPage() {
  const { data, error, isLoading } = useNotifications();
  const markNotificationAsReadMutation = useMarkNotificationAsRead();
  const notifications = data?.notifications ?? [];
  const unreadCount = notifications.filter((notification) => !notification.readAt).length;

  function handleNotificationClick(notificationId: string, readAt: string | null) {
    if (readAt || markNotificationAsReadMutation.isPending) {
      return;
    }

    markNotificationAsReadMutation.mutate(notificationId);
  }

  return (
    <main className="dashboard notifications-dashboard">
      <section className="hero-row" aria-labelledby="notifications-title">
        <div>
          <p className="kicker">NOTIFICATIONS</p>
          <h1 id="notifications-title">알림</h1>
        </div>
        <div className="month-status">
          <span>읽지 않음</span>
          <strong>{unreadCount}개</strong>
        </div>
      </section>

      <section className="calendar-card notifications-panel" aria-label="알림 목록">
        <div className="card-head">
          <div>
            <p className="label">INBOX</p>
            <h2>{notifications.length}개</h2>
          </div>
        </div>

        {isLoading ? (
          <StatusNotice
            className="schedule-message"
            description="대타 요청과 근무 변경 알림을 확인하고 있습니다."
            title="알림을 불러오는 중입니다."
            variant="loading"
          />
        ) : null}

        {error ? (
          <StatusNotice
            className="schedule-message"
            description={error instanceof Error ? error.message : "잠시 후 다시 시도해주세요."}
            title="알림을 불러오지 못했습니다."
            variant="error"
          />
        ) : null}

        {markNotificationAsReadMutation.error ? (
          <p className="form-error schedule-message">
            {markNotificationAsReadMutation.error instanceof Error
              ? markNotificationAsReadMutation.error.message
              : "알림 읽음 처리에 실패했습니다."}
          </p>
        ) : null}

        {!isLoading && !error && notifications.length === 0 ? (
          <StatusNotice
            description="대타 요청, 신청, 승인, 거절이 발생하면 이곳에 표시됩니다."
            title="아직 알림이 없습니다."
          />
        ) : null}

        {notifications.length > 0 ? (
          <div className="notification-list">
            {notifications.map((notification) => (
              <button
                className={`notification-card${notification.readAt ? "" : " unread"}`}
                key={notification.id}
                onClick={() => handleNotificationClick(notification.id, notification.readAt)}
                type="button"
              >
                <span className="notification-dot" aria-hidden="true" />
                <div>
                  <strong>{notification.title}</strong>
                  <p>{notification.message}</p>
                  <span>{getNotificationTimeLabel(notification.createdAt)}</span>
                </div>
                <em>{notification.readAt ? "읽음" : "새 알림"}</em>
              </button>
            ))}
          </div>
        ) : null}
      </section>
    </main>
  );
}
