import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppState } from '../state/useAppState'
import { fetchMyLetters, fetchMyMatches, fetchMyThreads } from '../lib/api'
import { dateShort } from '../lib/format'
import styles from './StoragePage.module.css'

const TABS = [
  { id: 'mine', label: '내가 쓴 편지' },
  { id: 'received', label: '받은 편지' },
  { id: 'linked', label: '이어진 편지' },
]

// 백엔드 Match.status(recommended/opened/dismissed/expired) → 배지 표시 매핑.
// 'replied'는 목록 API 자체에서 제외됨(답장 완료 건은 "이어진 편지" 탭으로 이동).
const RECEIVED_META = {
  recommended: { icon: 'mark_email_unread', badgeClass: 'badgeUnread', label: '미읽음' },
  opened: { icon: 'drafts', badgeClass: 'badgeRead', label: '읽음 · 답장 안 함' },
  dismissed: { icon: 'drafts', badgeClass: 'badgePassed', label: '스쳐감' },
  expired: { icon: 'drafts', badgeClass: 'badgePassed', label: '스쳐감' },
}

const LINKED_META = {
  sending: '전송 중',
  active: '대화 진행',
}

export default function StoragePage() {
  const { state, actions } = useAppState()
  const navigate = useNavigate()
  const [myLetters, setMyLetters] = useState([])
  const [loadError, setLoadError] = useState(false)
  const [myMatches, setMyMatches] = useState([])
  const [matchesError, setMatchesError] = useState(false)
  const [myThreads, setMyThreads] = useState([])
  const [threadsError, setThreadsError] = useState(false)

  useEffect(() => {
    fetchMyLetters()
      .then(setMyLetters)
      .catch(() => setLoadError(true))
    fetchMyMatches()
      .then(setMyMatches)
      .catch(() => setMatchesError(true))
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
            {myLetters.map((item) => (
              <li
                key={item.id}
                className={`${styles.item} ${styles.itemClickable}`}
                onClick={() => navigate(`/storage/mine/${item.id}`)}
              >
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
        <>
          {matchesError && <p className={styles.itemPreview}>받은 편지를 불러오지 못했어요.</p>}
          <ul className={styles.list}>
            {myMatches.map((item) => {
              const meta = RECEIVED_META[item.status]
              const isPassed = item.matched_letter.body === null
              const preview = isPassed
                ? '스쳐 지나간 편지예요.'
                : `${item.matched_letter.body.slice(0, 40)}…`
              return (
                <li
                  key={item.match_id}
                  className={`${styles.item} ${isPassed ? '' : styles.itemClickable}`}
                  onClick={isPassed ? undefined : () => navigate(`/storage/received/${item.match_id}`)}
                >
                  <span className={styles.iconBox}>
                    <span className="msym">{meta.icon}</span>
                  </span>
                  <div className={styles.itemBody}>
                    <p className={styles.itemFrom}>모음소 · 익명</p>
                    <p className={`${styles.itemPreview} ${isPassed ? styles.itemPreviewPassed : ''}`}>{preview}</p>
                  </div>
                  <span className={`${styles.badge} ${styles[meta.badgeClass]}`}>{meta.label}</span>
                </li>
              )
            })}
          </ul>
        </>
      )}

      {state.tab === 'linked' && (
        <>
          {threadsError && <p className={styles.itemPreview}>이어진 편지를 불러오지 못했어요.</p>}
          <ul className={styles.list}>
            {myThreads.map((item) => (
              <li
                key={item.letter_id}
                className={`${styles.item} ${styles.itemClickable}`}
                onClick={() => navigate(`/storage/linked/${item.letter_id}`)}
              >
                <span className={styles.iconBox}>
                  <span className="msym">forum</span>
                </span>
                <div className={styles.itemBody}>
                  <p className={styles.itemTitle}>이어진 대화</p>
                  <p className={styles.itemPreview}>{item.preview}</p>
                </div>
                <span className={`${styles.badge} ${styles.badgeLinked}`}>{LINKED_META[item.status]}</span>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  )
}
