import NotificationCard from './NotificationCard'
import './NotificationList.css'

function NotificationList({ notifications, onComplete }) {
  return (
    <div className="notification-list">
      {notifications.map((notification) => (
        <NotificationCard key={notification.id} notification={notification} onComplete={onComplete} />
      ))}
    </div>
  )
}

export default NotificationList
