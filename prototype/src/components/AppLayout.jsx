import { NavLink, Outlet, Link } from 'react-router-dom'
import './AppLayout.css'

const NAV = [
  { to: '/conditions', label: '조건 관리' },
  { to: '/journal', label: '저널' },
  { to: '/history', label: '히스토리' },
  { to: '/discord', label: 'Discord' },
]

export default function AppLayout() {
  return (
    <div className="layout">
      <header className="topnav">
        <div className="topnav-inner">
          <Link to="/journal" className="brand">
            🔦 Beacon
          </Link>
          <nav className="nav-links">
            {NAV.map((n) => (
              <NavLink
                key={n.to}
                to={n.to}
                className={({ isActive }) =>
                  isActive ? 'nav-link active' : 'nav-link'
                }
              >
                {n.label}
              </NavLink>
            ))}
          </nav>
          <Link to="/" className="nav-logout">
            로그아웃
          </Link>
        </div>
      </header>
      <main>
        <Outlet />
      </main>
    </div>
  )
}
