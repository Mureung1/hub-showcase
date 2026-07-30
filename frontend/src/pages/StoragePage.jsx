import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'motion/react'
import { useAppState } from '../state/useAppState'
import { fetchMyLetters, fetchMyThreads } from '../lib/api'
import { dateShort } from '../lib/format'
import styles from './StoragePage.module.css'

const TABS = [
  { id: 'mine', label: '내가 쓴 편지' },
  { id: 'linked', label: '이어진 편지' },
]

const LINKED_META = {
  sending: '전송 중',
  active: '대화 진행',
}

// 목록이 길어도 등장 효과가 너무 오래 걸리지 않도록 stagger 지연에 상한을 둔다.
const itemDelay = (index) => Math.min(index, 10) * 0.05

export default function StoragePage() {
  const { state, actions } = useAppState()
  const navigate = useNavigate()
  const [myLetters, setMyLetters] = useState([])
  const [loadError, setLoadError] = useState(false)
  const [myThreads, setMyThreads] = useState([])
  const [threadsError, setThreadsError] = useState(false)

  useEffect(() => {
    fetchMyLetters()
      .then(setMyLetters)
      .catch(() => setLoadError(true))
    fetchMyThreads()
      .then(setMyThreads)
      .catch(() => setThreadsError(true))
  }, [])

  return (
    <div className={styles.wrap}>
      <div className={styles.tabs}>
        {TABS.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            className={`${styles.tab} ${state.tab === id ? styles.tabActive : ''}`}
            onClick={() => actions.setTab(id)}
          >
            {label}
          </button>
        ))}
      </div>

      {state.tab === 'mine' && (
        <>
          {loadError && <p className={styles.itemPreview}>편지 목록을 불러오지 못했어요.</p>}
          <ul className={styles.list}>
            {myLetters.map((item, index) => (
              <motion.li
                key={item.id}
                className={`${styles.item} ${styles.itemClickable}`}
                onClick={() => navigate(`/storage/mine/${item.id}`)}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: itemDelay(index), ease: [0.22, 1, 0.36, 1] }}
              >
                <span className={styles.iconBox}>
                  <span className="msym">history_edu</span>
                </span>
                <div className={styles.itemBody}>
                  <p className={styles.itemTitle}>{item.title || '(제목 없음)'}</p>
                  <p className={styles.itemPreview}>{item.content.slice(0, 40)}…</p>
                </div>
                <span className={styles.itemDate}>{dateShort(item.createdAt)}</span>
              </motion.li>
            ))}
          </ul>
        </>
      )}

      {state.tab === 'linked' && (
        <>
          {threadsError && <p className={styles.itemPreview}>이어진 편지를 불러오지 못했어요.</p>}
          <ul className={styles.list}>
            {myThreads.map((item, index) => (
              <motion.li
                key={item.letter_id}
                className={`${styles.item} ${styles.itemClickable}`}
                onClick={() => navigate(`/storage/linked/${item.letter_id}`)}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: itemDelay(index), ease: [0.22, 1, 0.36, 1] }}
              >
                <span className={styles.iconBox}>
                  <span className="msym">forum</span>
                </span>
                <div className={styles.itemBody}>
                  <p className={styles.itemTitle}>이어진 대화</p>
                  <p className={styles.itemPreview}>{item.preview}</p>
                </div>
                <span className={`${styles.badge} ${styles.badgeLinked}`}>{LINKED_META[item.status]}</span>
              </motion.li>
            ))}
          </ul>
        </>
      )}
    </div>
  )
}
