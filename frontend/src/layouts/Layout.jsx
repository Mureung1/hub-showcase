import { Outlet, Link, useLocation } from 'react-router-dom';
import './Layout.css'

const Layout = () => {
  const location = useLocation()
  const isSubscriptionFormPage = location.pathname === '/subscriptions/new'

  return (
    <div className="app-layout">
      <header className="gnb">
        <Link to="/" className="gnb-logo">
            SUBZIP
        </Link>
        {!isSubscriptionFormPage && (
          <Link to="/subscriptions/new" className="gnb-cta">
            + 구독 서비스 등록
          </Link>
        )}
      </header>

      <main className="frame-body">
        <Outlet />
      </main>
    </div>
  )
}

export default Layout