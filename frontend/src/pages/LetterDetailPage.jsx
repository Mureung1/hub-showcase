import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useAppState } from '../state/useAppState'
import { fetchLetterById, fetchThreadById } from '../lib/api'
import { dateShort } from '../lib/format'
import paper from '../styles/letterPaper.module.css'
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
      <article className={paper.paper}>
        <div className={paper.meta}>
          {from && <span>{from}</span>}
          {date && <span>{date}</span>}
        </div>
        {title && <h2 className={paper.letterTitle}>{title}</h2>}
        <p className={paper.body}>{body}</p>
      </article>
    </div>
  )
}

// "이어진 편지"는 편지 한 통이 아니라 스레드라, 원본+답장이 여러 통 쌓일 수 있다. 작은 카드로
// 늘어놓지 않고 한 번에 편지지 한 장씩(기본값: 가장 최근) ‹ 이전/다음 › 으로 넘겨보게 한다.
// 마지막 편지가 상대방이 쓴 것(is_mine:false)이면 내 차례라 "답장 쓰기"를 보여주고, 실제 작성은
// /main의 답장 모드(startReplyToThread)를 그대로 재사용한다 — 이 화면 안엔 입력창이 없다.
function ThreadView({ messages, onBack }) {
  const { actions } = useAppState()
  const [pageIndex, setPageIndex] = useState(messages.length - 1)
  const message = messages[pageIndex]
  const lastMessage = messages[messages.length - 1]
  const isLastPage = pageIndex === messages.length - 1
  const canReply = isLastPage && lastMessage && !lastMessage.is_mine

  return (
    <div className={styles.wrap}>
      <BackButton onClick={onBack} />
      <article className={paper.paper}>
        <div className={paper.meta}>
          <span>{message.is_mine ? '나' : '상대방'}</span>
          <span>{dateShort(message.created_at)}</span>
          {message.is_mine && message.status === 'sending' && (
            <span className={styles.sendingBadge}>보내는 중 · 8시간 뒤 전달</span>
          )}
        </div>
        {message.title && <h2 className={paper.letterTitle}>{message.title}</h2>}
        <p className={paper.body}>{message.body}</p>

        <footer className={`${paper.footer} ${styles.threadFooter}`}>
          <div className={styles.pager}>
            <button
              type="button"
              className={styles.pageBtn}
              onClick={() => setPageIndex((i) => i - 1)}
              disabled={pageIndex === 0}
              aria-label="이전 편지"
            >
              <span className="msym">chevron_left</span>
            </button>
            <span className={styles.pageIndicator}>
              {pageIndex + 1} / {messages.length}
            </span>
            <button
              type="button"
              className={styles.pageBtn}
              onClick={() => setPageIndex((i) => i + 1)}
              disabled={isLastPage}
              aria-label="다음 편지"
            >
              <span className="msym">chevron_right</span>
            </button>
          </div>

          {canReply && (
            <button
              type="button"
              className={styles.btnPrimary}
              onClick={() => actions.startReplyToThread(lastMessage.letter_id)}
            >
              답장 쓰기
            </button>
          )}
        </footer>
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

  if (type === 'linked') {
    if (threadError) return <NotFoundView onBack={actions.openStorage} />
    if (!thread) return null
    return <ThreadView messages={thread.messages} onBack={actions.openStorage} />
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
