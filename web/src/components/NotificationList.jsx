import NotificationCard from './NotificationCard'
import './NotificationList.css'

function NotificationList({ notifications, onComplete, today }) {
  return (
    <div className="notification-list">
      {notifications.map((notification) => (
        <NotificationCard
          key={notification.id}
          notification={notification}
          onComplete={onComplete}
          today={today}
        />
      ))}
    </div>
  )
}

export default NotificationList
