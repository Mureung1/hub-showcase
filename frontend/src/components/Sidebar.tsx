import { useEffect, useRef, useState, type SVGProps } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { getAuthSession, logout } from '../api/auth'
import './Sidebar.css'

type IconProps = SVGProps<SVGSVGElement>

type SidebarUser = {
  name: string
  initial?: string
}

type SidebarProps = {
  user?: SidebarUser
  className?: string
}

type MenuItem = {
  label: string
  path: string
  end?: boolean
  icon: (props: IconProps) => React.ReactNode
}

function HomeIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}>
      <path d="m4 10.8 8-6.3 8 6.3v8.3a1.4 1.4 0 0 1-1.4 1.4H5.4A1.4 1.4 0 0 1 4 19.1v-8.3Z" />
      <path d="M9.3 20.5v-6.1h5.4v6.1" />
    </svg>
  )
}

function ReviewIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}>
      <path className="tastefit-sidebar__review-star" d="m12 3.5 2.45 5 5.55.8-4 3.9.95 5.5L12 16.1l-4.95 2.6.95-5.5-4-3.9 5.55-.8L12 3.5Z" />
    </svg>
  )
}

function ExploreIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}>
      <circle cx="10.8" cy="10.8" r="5.8" />
      <path d="m15.2 15.2 4.3 4.3" />
    </svg>
  )
}

function SettingsIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-2.86 2.86-.06-.06A1.7 1.7 0 0 0 15 19.4a1.7 1.7 0 0 0-1 .6 1.7 1.7 0 0 0-.4 1.1V21h-4v-.1A1.7 1.7 0 0 0 8.55 19.4a1.7 1.7 0 0 0-1.88.34l-.06.06-2.86-2.86.06-.06A1.7 1.7 0 0 0 4.15 15a1.7 1.7 0 0 0-.6-1 1.7 1.7 0 0 0-1.1-.4H2.4v-4h.05A1.7 1.7 0 0 0 4.15 8a1.7 1.7 0 0 0-.34-1.88l-.06-.06L6.61 3.2l.06.06A1.7 1.7 0 0 0 8.55 3.6a1.7 1.7 0 0 0 1-.6A1.7 1.7 0 0 0 10 1.9V1.8h4v.1A1.7 1.7 0 0 0 15.6 3.6a1.7 1.7 0 0 0 1.88-.34l.06-.06 2.86 2.86-.06.06A1.7 1.7 0 0 0 20 8a1.7 1.7 0 0 0 .6 1 1.7 1.7 0 0 0 1.1.4h.1v4h-.1A1.7 1.7 0 0 0 20 15Z" />
    </svg>
  )
}

const MENU_ITEMS: MenuItem[] = [
  { label: '홈', path: '/app', end: true, icon: HomeIcon },
  { label: '리뷰', path: '/reviews', icon: ReviewIcon },
  { label: '탐색', path: '/explore', icon: ExploreIcon },
  { label: '설정', path: '/settings', icon: SettingsIcon },
]

function Sidebar({
  user,
  className = '',
}: SidebarProps) {
  const navigate = useNavigate()
  const [isLogoutOpen, setIsLogoutOpen] = useState(false)
  const profileAreaRef = useRef<HTMLDivElement>(null)
  const logoutButtonRef = useRef<HTMLButtonElement>(null)
  const sessionUser = getAuthSession()?.user
  const displayName =
    user?.name.trim() ||
    sessionUser?.name?.trim() ||
    sessionUser?.email.split('@')[0] ||
    '사용자'
  const initial = user?.initial?.trim() || displayName.charAt(0)

  useEffect(() => {
    if (!isLogoutOpen) return

    logoutButtonRef.current?.focus()
    const handlePointerDown = (event: PointerEvent) => {
      if (!profileAreaRef.current?.contains(event.target as Node)) {
        setIsLogoutOpen(false)
      }
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsLogoutOpen(false)
    }

    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isLogoutOpen])

  const handleLogout = () => {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <aside className={`tastefit-sidebar ${className}`.trim()}>
      <NavLink className="tastefit-sidebar__brand" to="/app" aria-label="TasteFit 홈">
        <span className="tastefit-sidebar__brand-mark" aria-hidden="true">T</span>
        <span className="tastefit-sidebar__brand-name">TasteFit</span>
      </NavLink>

      <nav className="tastefit-sidebar__nav" aria-label="주요 메뉴">
        {MENU_ITEMS.map(({ label, path, end, icon: Icon }) => (
          <NavLink
            key={path}
            to={path}
            end={end}
            className={({ isActive }) =>
              `tastefit-sidebar__link${isActive ? ' tastefit-sidebar__link--active' : ''}`
            }
          >
            <Icon className="tastefit-sidebar__icon" />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="tastefit-sidebar__profile-area" ref={profileAreaRef}>
        {isLogoutOpen && (
          <div
            className="tastefit-sidebar__logout-popover"
            role="dialog"
            aria-label="로그아웃 확인"
          >
            <strong>로그아웃 하시겠습니까?</strong>
            <p>다시 이용하려면 로그인이 필요합니다.</p>
            <div className="tastefit-sidebar__logout-actions">
              <button type="button" onClick={() => setIsLogoutOpen(false)}>
                취소
              </button>
              <button
                className="tastefit-sidebar__logout-confirm"
                ref={logoutButtonRef}
                type="button"
                onClick={handleLogout}
              >
                로그아웃
              </button>
            </div>
          </div>
        )}

        <button
          className="tastefit-sidebar__profile"
          type="button"
          aria-label={`${displayName} 프로필 메뉴`}
          aria-expanded={isLogoutOpen}
          onClick={() => setIsLogoutOpen((current) => !current)}
        >
          <span className="tastefit-sidebar__avatar" aria-hidden="true">{initial}</span>
          <span className="tastefit-sidebar__profile-copy">
            <strong>{displayName}</strong>
            <small>내 프로필</small>
          </span>
        </button>
      </div>
    </aside>
  )
}

export default Sidebar
