import { useState } from 'react'
import { Link, NavLink, Navigate, Outlet, useNavigate } from 'react-router'
import logo from '../assets/logo.png'
import { useApi, apiPost } from '../api/client'
import NotificationBell from './NotificationBell'
import './AppLayout.css'

const MENU = [
  { to: 'dashboard', label: '대시보드', icon: '▦' },
  { to: 'progress', label: '프로젝트 진행', icon: '↗' },
  { to: 'projects', label: '프로젝트 관리', icon: '⚙' },
]

export default function AppLayout() {
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  // 로그인 확인 — /app/* 전체가 이 레이아웃 아래라 여기서 한 번에 가드된다
  const { loading, error, data } = useApi('/api/auth/me')

  if (loading) return <div className="app-loading">불러오는 중…</div>
  if (error) return <Navigate to="/login" replace />

  const user = data.user

  async function handleLogout() {
    try {
      await apiPost('/api/auth/logout')
    } catch {
      // 로그아웃 실패해도 화면은 로그인으로 되돌린다
    }
    navigate('/login', { replace: true })
  }

  return (
    <div className="app-shell">
      {sidebarOpen && <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />}

      <aside className={`sidebar${sidebarOpen ? ' open' : ''}`}>
        <div className="sidebar-brand">
          <img src={logo} alt="" />
          <div>
            <strong>팀플, 이지!</strong>
            <span>AI Agent 기반 팀 프로젝트 도우미</span>
          </div>
        </div>

        <nav className="sidebar-nav">
          {MENU.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}
              onClick={() => setSidebarOpen(false)}
            >
              <span className="sidebar-icon" aria-hidden="true">{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <Link to="/projects/new" className="btn btn-dark sidebar-new">＋ 새 프로젝트 만들기</Link>

          <div className="sidebar-utils">
            <button type="button" className="sidebar-link">
              <span className="sidebar-icon" aria-hidden="true">🔔</span>알림
            </button>
            <button type="button" className="sidebar-link">
              <span className="sidebar-icon" aria-hidden="true">❓</span>도움말
            </button>
          </div>

          <div className="sidebar-profile">
            <span className="avatar" aria-hidden="true">👤</span>
            <div className="sidebar-profile-info">
              <strong>{user.name}</strong>
              <span>@{user.username}</span>
            </div>
            <button
              type="button"
              className="sidebar-logout"
              onClick={handleLogout}
              aria-label="로그아웃"
              title="로그아웃"
            >
              ⏻
            </button>
          </div>
        </div>
      </aside>

      <div className="app-main">
        <header className="app-header">
          <button
            type="button"
            className="hamburger"
            onClick={() => setSidebarOpen(true)}
            aria-label="메뉴 열기"
          >
            ☰
          </button>
          <div className="app-header-actions">
            <NotificationBell />
            <button type="button" className="icon-btn" aria-label="프로필">👤</button>
          </div>
        </header>

        <main className="app-content">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
