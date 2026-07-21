import "./Sidebar.css";
import { useAuth } from "../features/auth/AuthContext.jsx";

const NAV_ITEMS = [
  {
    key: "chat-demo",
    label: "채팅 데모",
    icon: (
      <path d="M4 4h16v11H7l-3 3V4z" strokeWidth="1.6" strokeLinejoin="round" />
    ),
  },
  {
    key: "log-viewer",
    label: "탐지 로그",
    icon: (
      <path
        d="M4 5h16M4 11h16M4 17h10"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    ),
  },
];

export default function Sidebar({ active, onNavigate }) {
  const { user, logout } = useAuth();

  return (
    <aside className="sidebar">
      <div className="sidebar__logo">SG</div>
      <nav className="sidebar__nav">
        {NAV_ITEMS.map((item) => (
          <button
            key={item.key}
            type="button"
            className={
              "sidebar__item" +
              (active === item.key ? " sidebar__item--active" : "")
            }
            onClick={() => onNavigate(item.key)}
            title={item.label}
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 20 20"
              fill="none"
              stroke="currentColor"
            >
              {item.icon}
            </svg>
            <span className="sidebar__label">{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="sidebar__footer">
        <span className="sidebar__user">{user?.name}</span>
        <button type="button" className="sidebar__logout" onClick={logout}>
          로그아웃
        </button>
      </div>
    </aside>
  );
}
