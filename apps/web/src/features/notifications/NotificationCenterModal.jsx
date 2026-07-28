import Bell from 'lucide-react/dist/esm/icons/bell.mjs'
import CalendarClock from 'lucide-react/dist/esm/icons/calendar-clock.mjs'
import ChevronRight from 'lucide-react/dist/esm/icons/chevron-right.mjs'

import { Modal } from '../../components/ui/Modal.jsx'
import { formatShortDate } from '../../lib/format.js'
import styles from './NotificationCenterModal.module.css'

export function NotificationCenterModal({
  deadlineNotifications,
  invitations,
  onClose,
  onOpenTask,
  onOpenInvitations,
}) {
  const total = deadlineNotifications.length + invitations.length

  return (
    <Modal title="알림" onClose={onClose} width={520}>
      <div className={styles.summary}>
        <Bell aria-hidden="true" size={17} />
        <span>{total > 0 ? `확인할 알림이 ${total}건 있습니다.` : '새 알림이 없습니다.'}</span>
      </div>

      {deadlineNotifications.length > 0 ? (
        <section className={styles.section} aria-labelledby="deadline-notifications-title">
          <header>
            <h3 id="deadline-notifications-title">할 일 마감</h3>
            <span>{deadlineNotifications.length}건</span>
          </header>
          <div className={styles.list}>
            {deadlineNotifications.map((notification) => (
              <button
                className={styles.item}
                type="button"
                key={notification.id}
                onClick={() => onOpenTask(notification)}
              >
                <span className={`${styles.icon} ${styles[notification.tone]}`}><CalendarClock aria-hidden="true" size={16} /></span>
                <span className={styles.copy}>
                  <strong>{notification.taskTitle}</strong>
                  <small>{notification.projectName} · {formatShortDate(notification.dueDate)}</small>
                </span>
                <em className={styles[`${notification.tone}Text`]}>{notification.label}</em>
                <ChevronRight aria-hidden="true" size={15} />
              </button>
            ))}
          </div>
        </section>
      ) : null}

      {invitations.length > 0 ? (
        <section className={styles.section} aria-labelledby="invitation-notifications-title">
          <header>
            <h3 id="invitation-notifications-title">프로젝트 초대</h3>
            <span>{invitations.length}건</span>
          </header>
          <button className={styles.invitationLink} type="button" onClick={onOpenInvitations}>
            <span>{invitations.length}개의 받은 초대를 확인해 주세요.</span>
            <ChevronRight aria-hidden="true" size={15} />
          </button>
        </section>
      ) : null}
    </Modal>
  )
}
