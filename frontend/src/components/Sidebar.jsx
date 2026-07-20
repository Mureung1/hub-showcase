import { useLocation } from 'react-router-dom'
import { useAppState } from '../state/useAppState'
import { POOL_COUNT } from '../lib/format'
import styles from './Sidebar.module.css'

export default function Sidebar() {
  const { actions } = useAppState()
  const { pathname } = useLocation()
  const writeActive = pathname !== '/storage'
  const storageActive = pathname === '/storage'

  return (
    <nav className={styles.sidebar}>
      <div className={styles.poolCard}>
        <p className={styles.poolLabel}>모음소에 쌓인 편지</p>
        <p className={styles.poolCount}>
          {POOL_COUNT}
          <span className={styles.poolUnit}>통</span>
        </p>
        <p className={styles.poolLive}>지금도 도착하는 중</p>
      </div>

      <ul className={styles.menu}>
        <li>
          <button
            type="button"
            className={`${styles.menuItem} ${writeActive ? styles.menuItemActive : ''}`}
            onClick={actions.goMain}
          >
            <span className="msym">edit_note</span>
            Write
          </button>
        </li>
        <li>
          <button
            type="button"
            className={`${styles.menuItem} ${storageActive ? styles.menuItemActive : ''}`}
            onClick={actions.openStorage}
          >
            <span className="msym">inventory_2</span>
            Storage
          </button>
        </li>
      </ul>

      <button type="button" className={`${styles.menuItem} ${styles.logoutBtn}`} onClick={actions.signOut}>
        <span className="msym">logout</span>
        로그아웃
      </button>
    </nav>
  )
}
