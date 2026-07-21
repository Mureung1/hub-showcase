import { Link } from 'react-router-dom'
import { useTheme } from '../../hooks/useTheme'

// 로고+다크모드 토글만 담당하는 최소 헤더. 스테퍼/초기화/홈 버튼/이어하기 배너 완전판은
// #21(헤더/스테퍼/초기화 버튼) 스코프라 여기서 같이 만들지 않는다 — #22는 토큰+레이아웃+다크모드까지만.
const SUN_ICON = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2.2M12 19.8V22M4.93 4.93l1.55 1.55M17.52 17.52l1.55 1.55M2 12h2.2M19.8 12H22M4.93 19.07l1.55-1.55M17.52 6.48l1.55-1.55" />
  </svg>
)

const MOON_ICON = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
  </svg>
)

function Header() {
  const { theme, toggleTheme } = useTheme()
  const isDark = theme === 'dark'

  return (
    <header className="site-header">
      <div className="site-header-inner">
        <Link className="logo" to="/">
          <span className="logo-mark">S</span>
          <span className="logo-text">SpecFit</span>
        </Link>
        <div className="header-spacer" />
        <nav className="site-nav">
          <button
            type="button"
            className="nav-link theme-toggle-btn"
            onClick={toggleTheme}
            title={isDark ? '라이트 모드로 전환' : '다크 모드로 전환'}
            aria-label="다크모드 전환"
          >
            {isDark ? SUN_ICON : MOON_ICON}
          </button>
        </nav>
      </div>
    </header>
  )
}

export default Header
