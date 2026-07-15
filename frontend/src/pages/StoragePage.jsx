import { useEffect, useState } from 'react'
import { useAppState } from '../state/useAppState'
import { fetchMyLetters } from '../lib/api'
import { dateShort } from '../lib/format'
import { RECEIVED_LETTERS, LINKED_THREADS } from '../data/mock'
import styles from './StoragePage.module.css'

const TABS = [
  { id: 'mine', label: '내가 쓴 편지' },
  { id: 'received', label: '받은 편지' },
  { id: 'linked', label: '이어진 편지' },
]

const RECEIVED_META = {
  unread: { icon: 'mark_email_unread', badgeClass: 'badgeUnread', label: '미읽음' },
  read: { icon: 'drafts', badgeClass: 'badgeRead', label: '읽음 · 답장 안 함' },
  passed: { icon: 'drafts', badgeClass: 'badgePassed', label: '스쳐감' },
}

const LINKED_META = {
  sending: '전송 중',
  active: '대화 진행',
}

export default function StoragePage() {
  const { state, actions } = useAppState()
  const [myLetters, setMyLetters] = useState([])
  const [loadError, setLoadError] = useState(false)

  useEffect(() => {
    fetchMyLetters()
      .then(setMyLetters)
      .catch(() => setLoadError(true))
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
            {myLetters.map((item) => (
              <li key={item.id} className={styles.item}>
                <span className={styles.iconBox}>
                  <span className="msym">history_edu</span>
                </span>
                <div className={styles.itemBody}>
                  <p className={styles.itemTitle}>{item.title || '(제목 없음)'}</p>
                  <p className={styles.itemPreview}>{item.content.slice(0, 40)}…</p>
                </div>
                <span className={styles.itemDate}>{dateShort(item.createdAt)}</span>
              </li>
            ))}
          </ul>
        </>
      )}

      {state.tab === 'received' && (
        <ul className={styles.list}>
          {RECEIVED_LETTERS.map((item) => {
            const meta = RECEIVED_META[item.status]
            return (
              <li key={item.id} className={styles.item}>
                <span className={styles.iconBox}>
                  <span className="msym">{meta.icon}</span>
                </span>
                <div className={styles.itemBody}>
                  <p className={styles.itemFrom}>{item.from}</p>
                  <p className={`${styles.itemPreview} ${item.status === 'passed' ? styles.itemPreviewPassed : ''}`}>
                    {item.text}
                  </p>
                </div>
                <span className={`${styles.badge} ${styles[meta.badgeClass]}`}>{meta.label}</span>
              </li>
            )
          })}
        </ul>
      )}

      {state.tab === 'linked' && (
        <ul className={styles.list}>
          {LINKED_THREADS.map((item) => (
            <li key={item.id} className={styles.item}>
              <span className={styles.iconBox}>
                <span className="msym">forum</span>
              </span>
              <div className={styles.itemBody}>
                <p className={styles.itemTitle}>{item.title}</p>
                <p className={styles.itemPreview}>{item.text}</p>
              </div>
              <span className={`${styles.badge} ${styles.badgeLinked}`}>{LINKED_META[item.status]}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
