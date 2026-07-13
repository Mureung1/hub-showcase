import { NavLink, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase.js'
import './AppLayout.css'

const navItems = [
  // 허브(대시보드) → 루프 동선(저널→히스토리) → 보조 관리(조건).
  { to: '/dashboard', label: '대시보드' },
  { to: '/journal', label: '저널' },
  { to: '/history', label: '히스토리' },
  { to: '/conditions', label: '조건 관리' },
]

/**
 * 로그인 이후 보호 화면 전체에서 공유하는 레이아웃.
 * 상단 네비게이션 바(로고 + 메뉴 + 로그아웃)와 콘텐츠 영역으로 구성된다.
 */
function AppLayout({ children }) {
  const navigate = useNavigate()

  async function handleLogout() {
    if (supabase) {
      await supabase.auth.signOut()
    }
    navigate('/login', { replace: true })
  }

  return (
    <div className="app-layout">
      <header className="app-nav">
        <div className="app-nav__inner">
          <NavLink to="/" className="app-nav__logo">
            🔦 Beacon
          </NavLink>
          <div className="app-nav__right">
            <nav className="app-nav__links">
              {navItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    isActive ? 'app-nav__link app-nav__link--active' : 'app-nav__link'
                  }
                >
                  {item.label}
                </NavLink>
              ))}
            </nav>
            <button type="button" className="app-nav__logout" onClick={handleLogout}>
              로그아웃
            </button>
          </div>
        </div>
      </header>
      <main className="app-content">
        <div className="app-content__inner">{children}</div>
      </main>
    </div>
  )
}

export default AppLayout
