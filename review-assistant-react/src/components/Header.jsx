import { Link, useLocation } from 'react-router-dom'
import { useCurrentUser } from '../hooks/useCurrentUser.js'
import { logout as logoutApi } from '../lib/api.js'
import BrandMark from './BrandMark.jsx'

const NAV_STEPS = [
  { path: '/', label: '홈' },
  { path: '/guide', label: '사용법' },
  { path: '/app', label: '도구' },
  { path: '/dashboard', label: '총 분석' },
]

function Header() {
  const location = useLocation()
  const { user, checked, setUser } = useCurrentUser()

  async function handleLogout() {
    try {
      await logoutApi()
    } finally {
      setUser(null)
    }
  }

  return (
    <nav className="navbar">
      <Link to="/" className="nav-logo">
        <BrandMark />
        <span>리뷰 매니저 AI</span>
      </Link>

      <div className="nav-steps">
        {NAV_STEPS.map((step) => (
          <Link
            key={step.path}
            to={step.path}
            className={`nav-step ${location.pathname === step.path ? 'active' : ''}`}
          >
            {step.label}
          </Link>
        ))}
      </div>

      <div className="nav-links">
        {checked &&
          (user ? (
            <div className="nav-user">
              <Link to="/my-reviews" className="nav-my-reviews">
                내 리뷰
              </Link>
              <span className="nav-user-email">{user.email}</span>
              <button type="button" className="nav-logout-btn" onClick={handleLogout}>
                로그아웃
              </button>
            </div>
          ) : (
            <>
              <Link to="/login">로그인</Link>
              <Link to="/signup" className="nav-cta">
                회원가입
              </Link>
            </>
          ))}
      </div>
    </nav>
  )
}

export default Header
