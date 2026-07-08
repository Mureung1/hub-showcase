import { useState } from 'react';
import { Bell, Search } from 'lucide-react';
import { useAppStore } from '../../hooks/useAppStore';
import { formatDateKo } from '../../utils/date';
import './Header.css';

export default function Header() {
  const {
    searchQuery,
    setSearchQuery,
    data,
    markNotificationRead,
    markAllNotificationsRead,
  } = useAppStore();
  const [showNotifications, setShowNotifications] = useState(false);

  const unreadCount = data.notifications.filter((n) => !n.read).length;
  const today = formatDateKo(new Date().toISOString().split('T')[0]!);

  return (
    <header className="header">
      <div className="header-left">
        <div className="search-bar">
          <Search className="search-icon" size={16} />
          <input
            type="search"
            placeholder="회원 이름, 운동 검색..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="header-right">
        <span className="header-date">{today}</span>

        <div className="notification-wrapper">
          <button
            type="button"
            className="notification-btn"
            onClick={() => setShowNotifications((prev) => !prev)}
            aria-label="알림"
          >
            <Bell size={18} />
            {unreadCount > 0 && (
              <span className="notification-badge">{unreadCount}</span>
            )}
          </button>

          {showNotifications && (
            <div className="notification-dropdown">
              <div className="notification-header">
                <span>알림</span>
                <button
                  type="button"
                  className="mark-all-read"
                  onClick={markAllNotificationsRead}
                >
                  모두 읽음
                </button>
              </div>
              <ul className="notification-list">
                {data.notifications.length === 0 ? (
                  <li className="notification-empty">알림이 없습니다.</li>
                ) : (
                  data.notifications.map((n) => (
                    <li
                      key={n.id}
                      className={`notification-item ${n.read ? 'read' : ''}`}
                      onClick={() => markNotificationRead(n.id)}
                    >
                      <p>{n.message}</p>
                      <time>{n.time}</time>
                    </li>
                  ))
                )}
              </ul>
            </div>
          )}
        </div>

        <div className="trainer-profile">
          <span className="trainer-avatar">김</span>
          <span className="trainer-name">김트레이너</span>
        </div>
      </div>
    </header>
  );
}
