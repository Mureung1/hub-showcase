import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useAppState } from '../state/useAppState'
import { fetchLetterById } from '../lib/api'
import { dateShort } from '../lib/format'
import { RECEIVED_LETTERS, LINKED_THREADS } from '../data/mock'
import styles from './LetterDetailPage.module.css'

const MOCK_SOURCES = {
  received: RECEIVED_LETTERS,
  linked: LINKED_THREADS,
}

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

  if (type !== 'mine') {
    // 받은 편지 중 '스쳐감' 상태는 저장소에 흔적만 남기고 전체 내용은 보여주지 않는다.
    const found = MOCK_SOURCES[type]?.find((item) => item.id === id)
    if (!found || found.status === 'passed') {
      return <NotFoundView onBack={actions.openStorage} />
    }
    return (
      <LetterView
        from={found.from}
        date={found.date}
        title={found.title}
        body={found.text}
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
