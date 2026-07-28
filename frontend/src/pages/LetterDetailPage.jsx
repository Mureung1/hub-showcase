import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useAppState } from '../state/useAppState'
import { fetchLetterById, fetchMatchById, fetchThreadById } from '../lib/api'
import { dateShort } from '../lib/format'
import styles from './LetterDetailPage.module.css'

function BackButton({ onClick }) {
  return (
    <button type="button" className={styles.back} onClick={onClick}>
      <span className="msym">arrow_back</span> 저장함으로
    </button>
  )
}

function LetterView({ from, date, title, body, onBack }) {
  return (
    <div className={styles.wrap}>
      <BackButton onClick={onBack} />
      <article className={styles.letter}>
        <div className={styles.meta}>
          {from && <span>{from}</span>}
          {date && <span>{date}</span>}
        </div>
        {title && <h2 className={styles.letterTitle}>{title}</h2>}
        <p className={styles.letterBody}>{body}</p>
      </article>
    </div>
  )
}

function NotFoundView({ onBack }) {
  return (
    <div className={styles.wrap}>
      <BackButton onClick={onBack} />
      <p className={styles.error}>편지를 찾을 수 없어요.</p>
    </div>
  )
}

export default function LetterDetailPage() {
  const { type, id } = useParams()
  const { actions } = useAppState()
  const [mineLetter, setMineLetter] = useState(null)
  const [mineError, setMineError] = useState(false)
  const [match, setMatch] = useState(null)
  const [matchError, setMatchError] = useState(false)
  const [thread, setThread] = useState(null)
  const [threadError, setThreadError] = useState(false)

  useEffect(() => {
    if (type !== 'mine') return undefined
    let cancelled = false
    fetchLetterById(id)
      .then((data) => {
        if (!cancelled) setMineLetter(data)
      })
      .catch(() => {
        if (!cancelled) setMineError(true)
      })
    return () => {
      cancelled = true
    }
  }, [type, id])

  useEffect(() => {
    if (type !== 'received') return undefined
    let cancelled = false
    fetchMatchById(id)
      .then((data) => {
        if (!cancelled) setMatch(data)
      })
      .catch(() => {
        if (!cancelled) setMatchError(true)
      })
    return () => {
      cancelled = true
    }
  }, [type, id])

  useEffect(() => {
    if (type !== 'linked') return undefined
    let cancelled = false
    fetchThreadById(id)
      .then((data) => {
        if (!cancelled) setThread(data)
      })
      .catch(() => {
        if (!cancelled) setThreadError(true)
      })
    return () => {
      cancelled = true
    }
  }, [type, id])

  if (type === 'received') {
    // 스쳐감(dismissed/expired)은 백엔드가 애초에 404를 주므로 자연히 여기서 걸러진다.
    if (matchError) return <NotFoundView onBack={actions.openStorage} />
    if (!match) return null
    return (
      <LetterView
        from="모음소 · 익명"
        date={dateShort(match.created_at)}
        body={match.matched_letter.body}
        onBack={actions.openStorage}
      />
    )
  }

  if (type === 'linked') {
    if (threadError) return <NotFoundView onBack={actions.openStorage} />
    if (!thread) return null
    return (
      <LetterView
        from="이어진 대화"
        date={dateShort(thread.created_at)}
        title={thread.title}
        body={thread.body}
        onBack={actions.openStorage}
      />
    )
  }

  if (mineError) return <NotFoundView onBack={actions.openStorage} />
  if (!mineLetter) return null

  return (
    <LetterView
      from={mineLetter.from}
      date={dateShort(mineLetter.createdAt)}
      title={mineLetter.title}
      body={mineLetter.content}
      onBack={actions.openStorage}
    />
  )
}
