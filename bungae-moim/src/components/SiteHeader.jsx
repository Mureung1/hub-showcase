import { Link, NavLink } from 'react-router-dom'
import { useAppState } from '../context/AppStateContext.jsx'
import NotificationBell from './NotificationBell.jsx'
import TrustBadge from './TrustBadge.jsx'

// minimal: 생년월일 게이트에서 쓴다. 어차피 이동할 수 없는 상태라 가운데 nav를 숨긴다.
export default function SiteHeader({ minimal = false }) {
  const { currentUser, isLoggedIn, authLoading, logout } = useAppState()

  return (
    <header className="site-header">
      <div className="site-header-inner">
        <Link to="/" className="site-brand">
          ⚡ 번개모임
        </Link>

        {!minimal && (
          <nav className="site-nav" aria-label="주요 메뉴">
            <NavLink
              to="/meetings"
              className={({ isActive }) => `site-nav-link${isActive ? ' active' : ''}`}
            >
              모임 찾기
            </NavLink>
            <NavLink
              to="/meetings/new"
              className={({ isActive }) => `site-nav-link${isActive ? ' active' : ''}`}
            >
              모임 등록
            </NavLink>
          </nav>
        )}

        {/* authLoading 중에는 비워둔다. 비우지 않으면 "로그인" -> "이상진"으로 깜빡인다. */}
        <div className="site-header-right">
          {!authLoading && !isLoggedIn && (
            <Link to="/login" className="pill-btn pill-btn--accent pill-btn--sm">
              로그인
            </Link>
          )}

          {!authLoading && isLoggedIn && (
            <>
              <NotificationBell />
              <span className="site-user">
                <span className="site-user-name">{currentUser.nickname}</span>
                {/* MyPage:70과 같은 방식으로 그대로 넘긴다. 서버의 normalizeUser가
                    trust_score를 Number()로 변환해 내려주고, 비로그인 GUEST_USER도
                    trustScore: 0이라 TrustBadge의 Math.round(Number(score) || 0)이 안전하다. */}
                <TrustBadge score={currentUser.trustScore} />
              </span>
              <span className="site-header-divider" aria-hidden="true" />
              <NavLink
                to="/mypage"
                className={({ isActive }) => `site-nav-link${isActive ? ' active' : ''}`}
              >
                마이페이지
              </NavLink>
              <button type="button" className="site-nav-link site-nav-button" onClick={logout}>
                로그아웃
              </button>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
