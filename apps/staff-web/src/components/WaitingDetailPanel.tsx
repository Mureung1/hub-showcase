import type {
  QueuePosition,
  StaffNotificationHistoryItem,
  WaitingStatus,
} from "@baro-jinryo/shared";
import { formatPatientCounts, formatPositionRange } from "@baro-jinryo/shared";
import { CircleX, PauseCircle, RotateCcw } from "lucide-react";
import { useEffect, useState } from "react";
import {
  notificationDeliveryLabels,
  notificationTypeLabels,
  statusLabels,
} from "./queuePresentation";

interface WaitingDetailPanelProps {
  waiting: QueuePosition;
  activeQueueCount: number;
  onClose: () => void;
  onChangeStatus: (id: string, status: WaitingStatus) => void;
  onHold: (id: string) => void;
  onRestore: (id: string, position?: number) => void;
  onGetNotificationHistory: (waitingId: string) => Promise<StaffNotificationHistoryItem[]>;
}

const notificationDateFormatter = new Intl.DateTimeFormat("ko-KR", {
  month: "numeric",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Asia/Seoul",
});

export function WaitingDetailPanel({
  waiting,
  activeQueueCount,
  onClose,
  onChangeStatus,
  onHold,
  onRestore,
  onGetNotificationHistory,
}: WaitingDetailPanelProps) {
  const [restorePosition, setRestorePosition] = useState(1);
  const [history, setHistory] = useState<StaffNotificationHistoryItem[]>([]);
  const [historyState, setHistoryState] = useState<"loading" | "loaded" | "error">("loading");

  useEffect(() => {
    let active = true;
    void onGetNotificationHistory(waiting.entry.id)
      .then((nextHistory) => {
        if (!active) return;
        setHistory(nextHistory);
        setHistoryState("loaded");
      })
      .catch(() => {
        if (active) setHistoryState("error");
      });
    return () => {
      active = false;
    };
  }, [onGetNotificationHistory, waiting.entry.id]);

  return (
    <aside className="staff-detail">
      <button className="detail-close" type="button" aria-label="상세 닫기" onClick={onClose}>
        ×
      </button>
      <p>접수번호</p>
      <h2>{waiting.entry.ticketNumber}</h2>
      <dl>
        <div><dt>유형</dt><dd>{waiting.entry.source === "remote" ? "원격" : "현장"}</dd></div>
        <div><dt>가족 인원</dt><dd>{formatPatientCounts(waiting.entry)}</dd></div>
        <div><dt>현재 상태</dt><dd>{statusLabels[waiting.entry.status]}</dd></div>
        <div><dt>대기 팀</dt><dd>{waiting.teamNumber ? `${waiting.teamNumber}팀` : "대기열 제외"}</dd></div>
        <div><dt>실제 환자 순서</dt><dd>{formatPositionRange(waiting)}</dd></div>
      </dl>
      <section
        className="notification-history"
        role="region"
        aria-labelledby="notification-history-title"
      >
        <h3 id="notification-history-title">알림 발송 이력</h3>
        {historyState === "loading" && <p>알림 이력을 불러오는 중입니다.</p>}
        {historyState === "error" && (
          <p className="notification-history__error">알림 이력을 불러오지 못했습니다.</p>
        )}
        {historyState === "loaded" && history.length === 0 && (
          <p>아직 발송된 알림이 없습니다.</p>
        )}
        {history.length > 0 && (
          <ul>
            {history.map((notification) => (
              <li key={notification.id}>
                <div>
                  <strong>{notificationTypeLabels[notification.notificationType]}</strong>
                  <time dateTime={notification.sentAt ?? notification.createdAt}>
                    {notificationDateFormatter.format(
                      new Date(notification.sentAt ?? notification.createdAt),
                    )}
                  </time>
                </div>
                <span
                  className={`notification-history__status notification-history__status--${notification.deliveryStatus}`}
                >
                  {notificationDeliveryLabels[notification.deliveryStatus]}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
      <div className="detail-actions">
        {waiting.entry.status === "held" && (
          <label>
            복귀 팀 위치
            <input
              type="number"
              min={1}
              max={activeQueueCount + 1}
              value={restorePosition}
              onChange={(event) => setRestorePosition(event.target.valueAsNumber)}
            />
            <button
              type="button"
              disabled={
                !Number.isInteger(restorePosition) ||
                restorePosition < 1 ||
                restorePosition > activeQueueCount + 1
              }
              onClick={() => onRestore(waiting.entry.id, restorePosition)}
            >
              <RotateCcw size={18} /> 지정 위치로 복귀
            </button>
          </label>
        )}
        {waiting.entry.status !== "held" && (
          <button type="button" onClick={() => onHold(waiting.entry.id)}>
            <PauseCircle size={18} /> 보류
          </button>
        )}
        <button
          className="danger"
          type="button"
          onClick={() => onChangeStatus(waiting.entry.id, "cancelled")}
        >
          <CircleX size={18} /> 취소
        </button>
      </div>
    </aside>
  );
}
