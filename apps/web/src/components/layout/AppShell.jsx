import Layers3 from 'lucide-react/dist/esm/icons/layers-3.mjs'
import Plus from 'lucide-react/dist/esm/icons/plus.mjs'
import CheckSquare from 'lucide-react/dist/esm/icons/square-check-big.mjs'
import Users from 'lucide-react/dist/esm/icons/users.mjs'
import { NavLink, Outlet } from 'react-router-dom'

import styles from './AppShell.module.css'

const FUTURE_NAV_ITEMS = [
  { label: '내 할 일', icon: CheckSquare },
  { label: '전체 팀원', icon: Users },
]

/**
 * Shared application frame used by the project overview and future home pages.
 */
export function AppShell() {
  return (
    <div className={styles.shell}>
      <aside className={styles.sidebar}>
        <header className={styles.brandHeader}>
          <div className={styles.brandMark} aria-hidden="true">
            TF
          </div>
          <span className={styles.brandName}>TeamFlow</span>
        </header>

        <div className={styles.createArea}>
          <button
            className={styles.createButton}
            type="button"
            disabled
            title="첫 화면 검수 후 연결됩니다."
          >
            <Plus aria-hidden="true" size={16} strokeWidth={1.9} />
            새 프로젝트
          </button>
        </div>

        <nav className={styles.navigation} aria-label="개요 메뉴">
          <p className={styles.navigationLabel}>개요</p>
          <NavLink
            className={({ isActive }) =>
              `${styles.navigationItem} ${isActive ? styles.navigationItemActive : ''}`
            }
            to="/projects"
          >
            <Layers3 aria-hidden="true" size={17} strokeWidth={1.8} />
            프로젝트
          </NavLink>
          {FUTURE_NAV_ITEMS.map(({ label, icon: Icon }) => (
            <div
              className={styles.navigationItem}
              key={label}
              title="첫 화면 검수 후 연결됩니다."
            >
              <Icon aria-hidden="true" size={17} strokeWidth={1.8} />
              {label}
            </div>
          ))}
        </nav>

        <footer className={styles.accountArea}>
          <div className={styles.accountAvatar} aria-hidden="true">
            이
          </div>
          <div className={styles.accountCopy}>
            <strong>이주환</strong>
            <span>내 계정</span>
          </div>
        </footer>
      </aside>

      <main className={styles.main}>
        <Outlet />
      </main>
    </div>
  )
}
