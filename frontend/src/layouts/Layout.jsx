import { Outlet, useLocation } from 'react-router-dom';
import './Layout.css'

const Layout = () => {
  const location = useLocation()
  const isSubscriptionFormPage = location.pathname === '/subscriptions/new'

  return (
    <div className="app-layout">
      <header className="gnb">
        <span className="gnb-logo">SUBZIP</span>
        {!isSubscriptionFormPage && (
          <a href="/subscriptions/new" className="gnb-cta">
            + 구독 서비스 등록
          </a>
        )}
      </header>

      <main className="frame-body">
        <Outlet />
      </main>
    </div>
  )
}

export default Layout