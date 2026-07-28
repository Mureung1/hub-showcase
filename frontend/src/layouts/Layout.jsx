import { useEffect, useState } from 'react'
import { Outlet, Link, useLocation } from 'react-router-dom';
import { fetchMe, clearToken } from '../lib/auth'
import { API_BASE } from '../lib/apiBase'
import './Layout.css'

const Layout = () => {
  const location = useLocation()
  const isSubscriptionFormPage = location.pathname === '/subscriptions/new'
  const [user, setUser] = useState(null)

  useEffect(() => {
    fetchMe().then(setUser)
  }, [])

  const handleLogout = () => {
    clearToken()
    window.location.href = '/'
  }

  return (
    <div className="app-layout">
      <header className="gnb">
        <Link to="/" className="gnb-logo">
            SUBZIP
        </Link>
        <div className="gnb-actions">
          <Link to="/about" className="gnb-nav-link">
            소개
          </Link>
          {!isSubscriptionFormPage && (
            <Link to="/subscriptions/new" className="gnb-cta">
              + 구독 서비스 등록
            </Link>
          )}
          {user ? (
            <button type="button" className="gnb-login" onClick={handleLogout}>
              로그아웃
            </button>
          ) : (
            <a href={`${API_BASE}/api/auth/google`} className="gnb-login">
              로그인
            </a>
          )}
          {user && (
            <span className="gnb-account" title={user.email}>
              {user.email.split('@')[0]}
            </span>
          )}
        </div>
      </header>

      <main className="frame-body">
        <Outlet />
      </main>
    </div>
  )
}

export default Layout