import { NavLink, Outlet } from 'react-router'
import { ResizableNavigator } from '../components/navigation'
import styles from './AppShell.module.css'

const navItems = [
  { label: '홈', to: '/' },
  { label: '오늘 학습', to: '/today' },
  { label: '커리큘럼 보관함', to: '/curriculum/history' },
  { label: '워크스페이스', to: '/workspace' },
  { label: 'Git Lab', to: '/git-lab' },
  { label: '오답노트', to: '/mistake-notes' },
  { label: '프로필', to: '/profile' },
]

export function AppShell() {
  return (
    <div className={styles.shell}>
      <ResizableNavigator
        ariaLabel="ICU 주요 화면"
        className={styles.navigator}
        collapsedLabel="메뉴 열기"
        defaultWidth={248}
        disableResizeQuery="(max-width: 760px)"
        storageKey="icu:app-navigator"
      >
        <NavLink className={styles.brand} to="/" aria-label="ICU 홈으로 이동">
          <span>ICU</span>
          <small>I CODE U</small>
        </NavLink>

        <nav className={styles.navList} aria-label="ICU 화면 이동">
          {navItems.map((item) => (
            <NavLink
              className={({ isActive }) => (isActive ? styles.activeNavItem : undefined)}
              end={item.to === '/'}
              key={item.to}
              to={item.to}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </ResizableNavigator>

      <main className={styles.content}>
        <Outlet />
      </main>
    </div>
  )
}
