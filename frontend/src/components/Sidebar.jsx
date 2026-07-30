import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'motion/react'
import { useAppState } from '../state/useAppState'
import { fetchLetterCount } from '../lib/api'
import styles from './Sidebar.module.css'

const POOL_COUNT_POLL_MS = 20_000

// 숫자 한 자리. 값이 바뀔 때 이전 자리는 위로 사라지고 새 자리는 아래에서 올라온다.
// 콤마 등 숫자가 아닌 문자는 애니메이션 없이 그대로 보여준다.
function RollingDigit({ char }) {
  if (!/[0-9]/.test(char)) {
    return <span className={styles.digitStatic}>{char}</span>
  }
  return (
    <span className={styles.digitSlot}>
      <AnimatePresence mode="popLayout">
        <motion.span
          key={char}
          className={styles.digit}
          initial={{ y: '100%', opacity: 0 }}
          animate={{ y: '0%', opacity: 1 }}
          exit={{ y: '-100%', opacity: 0 }}
          transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        >
          {char}
        </motion.span>
      </AnimatePresence>
    </span>
  )
}

export default function Sidebar() {
  const { actions } = useAppState()
  const { pathname } = useLocation()
  const writeActive = pathname !== '/storage'
  const storageActive = pathname === '/storage'
  const [poolCount, setPoolCount] = useState(null)

  // 새로고침 없이 반영되도록 주기적으로 다시 조회한다(추천 폴링과 같은 패턴, 20초 간격).
  useEffect(() => {
    const poll = () => {
      fetchLetterCount()
        .then(({ count }) => setPoolCount(count))
        .catch(() => {})
    }
    poll()
    const id = setInterval(poll, POOL_COUNT_POLL_MS)
    return () => clearInterval(id)
  }, [])

  // 로딩 중엔 0에서 시작 — 실제 값이 도착하면 각 자리가 굴러 올라가며 등장한다.
  const display = (poolCount ?? 0).toLocaleString('ko-KR')

  return (
    <nav className={styles.sidebar}>
      <div className={styles.poolCard}>
        <p className={styles.poolLabel}>모음소에 쌓인 편지</p>
        <p className={styles.poolCount}>
          {display.split('').map((char, i) => (
            <RollingDigit key={i} char={char} />
          ))}
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
