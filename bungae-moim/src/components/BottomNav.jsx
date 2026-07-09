import { NavLink } from 'react-router-dom'

const LINKS = [
  { to: '/', icon: '🏠', label: '홈', end: true },
  { to: '/meetings', icon: '🔍', label: '모임찾기' },
  { to: '/meetings/new', icon: '✏️', label: '모임등록' },
  { to: '/mypage', icon: '👤', label: '마이페이지' },
]

export default function BottomNav() {
  return (
    <nav className="bottom-nav" aria-label="주요 메뉴">
      {LINKS.map((link) => (
        <NavLink
          key={link.to}
          to={link.to}
          end={link.end}
          className={({ isActive }) => `bottom-nav-link${isActive ? ' active' : ''}`}
        >
          <span className="bottom-nav-icon" aria-hidden="true">
            {link.icon}
          </span>
          {link.label}
        </NavLink>
      ))}
    </nav>
  )
}
