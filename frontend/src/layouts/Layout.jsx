import { useEffect, useState } from 'react'
import { Outlet, Link, useLocation } from 'react-router-dom';
import { fetchMe } from '../lib/auth'
import './Layout.css'

const Layout = () => {
  const location = useLocation()
  const isSubscriptionFormPage = location.pathname === '/subscriptions/new'
  const [user, setUser] = useState(null)

  useEffect(() => {
    fetchMe().then(setUser)
  }, [])

  return (
    <div className="app-layout">
      <header className="gnb">
        <Link to="/" className="gnb-logo">
            SUBZIP
        </Link>
        <div className="gnb-actions">
          {!isSubscriptionFormPage && (
            <Link to="/subscriptions/new" className="gnb-cta">
              + 구독 서비스 등록
            </Link>
          )}
          {user ? (
            <Link to="/mypage" className="gnb-login">
              마이페이지
            </Link>
          ) : (
            <a href="/api/auth/google" className="gnb-login">
              로그인
            </a>
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