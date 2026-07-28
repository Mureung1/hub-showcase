import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useAppState } from '../state/useAppState'
import { fetchLetterById, fetchMatchById, fetchThreadById, replyToThreadLetter } from '../lib/api'
import { charCount, dateShort } from '../lib/format'
import { validateLetterContent, MIN_LETTER_LENGTH } from '../lib/validateLetter'
import styles from './LetterDetailPage.module.css'

function BackButton({ onClick }) {
  return (
    <button type="button" className={styles.back} onClick={onClick}>
      <span className="msym">arrow_back</span> 저장함으로
    </button>
  )
}

function LetterView({ from, date, title, body, onBack, actionsSlot }) {
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
      {actionsSlot}
    </div>
  )
}

// "이어진 편지"는 편지 한 통이 아니라 스레드라, 원본+답장을 시간순으로 전부 보여준다.
// 마지막 메시지가 상대방이 쓴 것(is_mine:false)이면 내 차례라 답장 입력창을 보여준다.
function ThreadView({ messages, onBack, onReplySent }) {
  const lastMessage = messages[messages.length - 1]
  const canReply = lastMessage && !lastMessage.is_mine

  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')

  const handleSend = async () => {
    if (!validateLetterContent(draft)) {
      const trimmedLength = draft.trim().length
      setError(
        trimmedLength === 0
          ? '편지 내용을 먼저 적어주세요.'
          : trimmedLength < MIN_LETTER_LENGTH
            ? `편지 내용은 ${MIN_LETTER_LENGTH}자 이상 적어주세요.`
            : '편지가 너무 길어요.',
      )
      return
    }
    if (sending) return
    setSending(true)
    setError('')
    try {
      await replyToThreadLetter(lastMessage.letter_id, { content: draft })
      setDraft('')
      onReplySent()
    } catch (err) {
      setError(err.message || '답장을 보내지 못했어요. 잠시 후 다시 시도해주세요.')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className={styles.wrap}>
      <BackButton onClick={onBack} />
      <div className={styles.threadList}>
        {messages.map((msg) => (
          <article key={msg.letter_id} className={styles.letter}>
            <div className={styles.meta}>
              <span>{msg.is_mine ? '나' : '상대방'}</span>
              <span>{dateShort(msg.created_at)}</span>
            </div>
            {msg.title && <h2 className={styles.letterTitle}>{msg.title}</h2>}
            <p className={styles.letterBody}>{msg.body}</p>
          </article>
        ))}
      </div>
      {canReply && (
        <div className={styles.replyBox}>
          <textarea
            className={styles.replyInput}
            placeholder="답장을 적어주세요…"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
          />
          <div className={styles.replyFooter}>
            <span className={styles.charCount}>
              {charCount(draft)}자 작성 중 (최소 {MIN_LETTER_LENGTH}자)
            </span>
            <button type="button" className={styles.btnPrimary} onClick={handleSend} disabled={sending}>
              답장 보내기
            </button>
          </div>
          {error && <p className={styles.error}>{error}</p>}
        </div>
      )}
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
  const [threadRefreshKey, setThreadRefreshKey] = useState(0)

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
  }, [type, id, threadRefreshKey])

  if (type === 'received') {
    // 스쳐감(dismissed/expired)은 백엔드가 애초에 404를 주므로 자연히 여기서 걸러진다.
    if (matchError) return <NotFoundView onBack={actions.openStorage} />
    if (!match) return null
    // 아직 답장도 스쳐 가기도 안 한 추천만 여기서 처리할 수 있게 한다. 이 화면이 새로고침/재로그인
    // 후에도 미해결 추천을 풀 수 있는 유일한 통로다(원래 흐름인 RecommendPage는 세션에 남아있는
    // recommendation에 의존해서, 세션이 끊기면 그 추천을 다시 열 방법이 없었다).
    const isUnresolved = match.status === 'recommended' || match.status === 'opened'
    return (
      <LetterView
        from="모음소 · 익명"
        date={dateShort(match.created_at)}
        body={match.matched_letter.body}
        onBack={actions.openStorage}
        actionsSlot={
          isUnresolved && (
            <div className={styles.actions}>
              <button
                type="button"
                className={styles.btnPrimary}
                onClick={() => actions.startReplyToMatch(match.match_id)}
              >
                답장 쓰기
              </button>
              <button
                type="button"
                className={styles.btnOutline}
                onClick={() => actions.dismissMatchById(match.match_id)}
              >
                스쳐 가기
              </button>
            </div>
          )
        }
      />
    )
  }

  if (type === 'linked') {
    if (threadError) return <NotFoundView onBack={actions.openStorage} />
    if (!thread) return null
    return (
      <ThreadView
        messages={thread.messages}
        onBack={actions.openStorage}
        onReplySent={() => setThreadRefreshKey((key) => key + 1)}
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
