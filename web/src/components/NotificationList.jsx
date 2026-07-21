import NotificationCard from './NotificationCard'
import './NotificationList.css'

function NotificationList({ notifications }) {
  return (
    <div className="notification-list">
      {notifications.map((notification) => (
        <NotificationCard key={notification.id} notification={notification} />
      ))}
    </div>
  )
}

export default NotificationList
