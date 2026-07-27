import { useEffect, useRef, type FormEvent } from 'react'
import type { TutorMessage } from '../tutorConversation'
import styles from '../LearningWorkspace.module.css'

type WorkspaceGuidePanelProps = {
  tutorMessages: TutorMessage[]
  tutorQuestion: string
  isAskingTutor: boolean
  onTutorQuestionChange: (value: string) => void
  onSubmitTutorQuestion: (event: FormEvent<HTMLFormElement>) => void
}

export function WorkspaceGuidePanel({
  tutorMessages,
  tutorQuestion,
  isAskingTutor,
  onTutorQuestionChange,
  onSubmitTutorQuestion,
}: WorkspaceGuidePanelProps) {
  const conversationRef = useRef<HTMLUListElement | null>(null)

  useEffect(() => {
    const el = conversationRef.current
    if (!el) {
      return
    }

    el.scrollTop = el.scrollHeight
  }, [tutorMessages.length, isAskingTutor])

  return (
    <main className={styles.guidePanel} aria-label="AI 튜터">
      <ul
        className={styles.tutorConversation}
        aria-label="튜터 대화"
        aria-live="polite"
        ref={conversationRef}
      >
        {tutorMessages.map((message, index) => (
          <li
            key={`${message.role}-${index}`}
            className={
              message.role === 'user'
                ? styles.tutorMessageUser
                : message.role === 'error'
                  ? styles.tutorMessageError
                  : styles.tutorMessageTutor
            }
          >
            {message.text}
          </li>
        ))}
        {isAskingTutor ? (
          <li className={styles.tutorMessageLoading} aria-label="튜터 답변 준비 중">
            <span className={styles.tutorLoadingBurst}>
              <span />
              <span />
              <span />
              <span />
              <span />
            </span>
          </li>
        ) : null}
      </ul>

      <form className={styles.tutorComposer} onSubmit={onSubmitTutorQuestion}>
        <input
          placeholder="튜터에게 질문하기..."
          aria-label="튜터에게 질문하기"
          value={tutorQuestion}
          onChange={(event) => onTutorQuestionChange(event.target.value)}
          disabled={isAskingTutor}
        />
        <button type="submit" disabled={isAskingTutor || !tutorQuestion.trim()}>
          {isAskingTutor ? '답변 중...' : '전송'}
        </button>
      </form>
    </main>
  )
}
