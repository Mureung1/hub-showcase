import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/AuthContext.jsx'
import './Layout.css'

const NAV_ITEMS = [
  { to: '/', label: '홈', end: true },
  { to: '/archive', label: '둘러보기' },
  { to: '/write', label: '작성하기' },
  { to: '/challenges', label: '챌린지' },
  { to: '/guide', label: '가이드' },
  { to: '/tutorial', label: '튜토리얼' },
  { to: '/me', label: '마이페이지' },
]

function Layout() {
  const auth = useAuth()
  const navigate = useNavigate()

  async function handleSignOut() {
    await auth.signOut()
    navigate('/', { replace: true })
  }

  return (
    <div className="rs-shell">
      <div className="rs-orbs" aria-hidden="true">
        <span className="rs-orb rs-orb-a" />
        <span className="rs-orb rs-orb-b" />
        <span className="rs-orb rs-orb-c" />
      </div>
      <header className="rs-nav">
        <NavLink to="/" className="rs-brand">
          역기획소
          <span className="rs-brand-code">respec</span>
        </NavLink>
        <nav className="rs-nav-links" aria-label="주요 메뉴">
          {NAV_ITEMS.map(({ to, label, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) => `rs-nav-link${isActive ? ' is-active' : ''}`}
            >
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="rs-nav-auth">
          {auth.isLoggedIn ? (
            <>
              <span className="rs-nav-user" title={auth.user.email}>
                {auth.user.email?.split('@')[0]}
              </span>
              <button className="rs-nav-authbtn" onClick={handleSignOut}>
                로그아웃
              </button>
            </>
          ) : (
            auth.isAuthEnabled && (
              <NavLink to="/login" className="rs-nav-authbtn">
                로그인
              </NavLink>
            )
          )}
        </div>
      </header>
      <main className="rs-main">
        <Outlet />
      </main>
      <footer className="rs-footer">
        <p>역기획소 프로토타입 — 목데이터 기반 데모이며, 문서·코멘트 내용은 예시입니다.</p>
      </footer>
    </div>
  )
}

export default Layout
