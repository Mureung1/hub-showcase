import { useState, type FormEvent } from 'react'
import {
  Check,
  MessageCircle,
  Send,
  Sparkles,
  Square,
  X,
} from 'lucide-react'

import type { TargetProductQuestion } from '@ay-ple/product-contract'

import {
  type PreparedClarificationEntry,
  type PreparedSemanticReviewEntry,
  type PreparedTranscriptEntry,
  usePreparedProductChat,
} from './use-prepared-product-chat.js'

type PreparedChatController = ReturnType<typeof usePreparedProductChat>

export function PreparedProductChat({
  controller,
}: {
  readonly controller: PreparedChatController
}) {
  const onSubmit = (event: FormEvent) => {
    event.preventDefault()
    void controller.submitMessage()
  }
  return (
    <div className="chat-shell product-chat-shell">
      <header className="chat-header">
        <div>
          <p className="eyebrow">Companion</p>
          <h2>AY Chat</h2>
        </div>
        <span
          className="phase-pill"
          data-product-operation-phase={controller.state.phase}
        >
          {phaseLabel(controller.state.phase)}
        </span>
      </header>

      {controller.canInterrupt ? (
        <div className="chat-controls product-chat-controls">
          <button
            className="interrupt-button"
            type="button"
            onClick={() => void controller.interrupt()}
          >
            <Square size={12} fill="currentColor" /> 작업 중단
          </button>
        </div>
      ) : null}

      <section
        className="transcript-panel product-transcript"
        aria-label="AY 작업 흐름"
        aria-live="polite"
      >
        {controller.state.transcript.length === 0 ? (
          <div className="product-chat-empty">
            <Sparkles size={24} />
            <strong>AY에게 학기 작업을 맡겨 보세요</strong>
            <span>
              AY는 이 Git workspace의 project Skill과 MCP를 사용해 actual
              file에서 작업합니다.
            </span>
          </div>
        ) : (
          <ol className="product-activity-list">
            {controller.state.transcript.map((entry, index) => (
              <PreparedTranscriptRow
                key={`${entry.kind}:${index}`}
                entry={entry}
                responsePending={controller.responsePending}
                onReview={controller.settleReview}
                onAnswer={controller.answerClarification}
                onCancel={controller.cancelClarification}
              />
            ))}
          </ol>
        )}
        {controller.state.failure ? (
          <div className="product-stream-failure" role="alert">
            <strong>AY 작업을 계속하지 못했습니다</strong>
            <span>{controller.state.failure}</span>
          </div>
        ) : null}
      </section>

      <form className="composer product-composer" onSubmit={onSubmit}>
        <label htmlFor="prepared-chat-prompt">메시지</label>
        <div className="composer-row">
          <textarea
            id="prepared-chat-prompt"
            value={controller.draft}
            disabled={!controller.canCompose}
            placeholder={
              controller.canCompose
                ? 'AY에게 작업을 설명해 주세요'
                : 'AY 작업을 준비하고 있습니다'
            }
            rows={2}
            onChange={(event) => controller.setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault()
                event.currentTarget.form?.requestSubmit()
              }
            }}
          />
          <button
            className="send-button"
            type="submit"
            disabled={!controller.canSubmit}
            aria-label="메시지 보내기"
          >
            <Send size={17} />
          </button>
        </div>
        <div className="composer-footnote">
          <MessageCircle size={12} /> Review 결과는 같은 AY Turn으로
          돌아가며, 실제 변경은 Git workspace에 남습니다.
        </div>
      </form>
    </div>
  )
}

function PreparedTranscriptRow({
  entry,
  responsePending,
  onReview,
  onAnswer,
  onCancel,
}: {
  readonly entry: PreparedTranscriptEntry
  readonly responsePending: boolean
  readonly onReview: (
    review: PreparedSemanticReviewEntry,
    result:
      | { readonly outcome: 'accept' }
      | { readonly outcome: 'revise'; readonly feedback: string }
      | { readonly outcome: 'reject'; readonly feedback?: string },
  ) => Promise<void>
  readonly onAnswer: (
    interaction: PreparedClarificationEntry,
    answers: Readonly<Record<string, readonly string[]>>,
  ) => Promise<void>
  readonly onCancel: (
    interaction: PreparedClarificationEntry,
  ) => Promise<void>
}) {
  if (entry.kind === 'semantic-review') {
    return (
      <li>
        <PreparedReviewCard
          review={entry}
          disabled={responsePending}
          onReview={onReview}
        />
      </li>
    )
  }
  if (entry.kind === 'clarification') {
    return (
      <li>
        <PreparedClarificationCard
          interaction={entry}
          disabled={responsePending}
          onAnswer={onAnswer}
          onCancel={onCancel}
        />
      </li>
    )
  }
  return (
    <li className={`product-transcript-row is-${entry.kind}`}>
      <strong>
        {entry.kind === 'user'
          ? '나'
          : entry.kind === 'plan'
            ? 'AY 계획'
            : entry.kind === 'agent'
              ? 'AY'
              : '안내'}
      </strong>
      <p>{entry.text}</p>
    </li>
  )
}

function PreparedReviewCard({
  review,
  disabled,
  onReview,
}: {
  readonly review: PreparedSemanticReviewEntry
  readonly disabled: boolean
  readonly onReview: (
    review: PreparedSemanticReviewEntry,
    result:
      | { readonly outcome: 'accept' }
      | { readonly outcome: 'revise'; readonly feedback: string }
      | { readonly outcome: 'reject'; readonly feedback?: string },
  ) => Promise<void>
}) {
  const [feedback, setFeedback] = useState('')
  const [revising, setRevising] = useState(false)
  const label = review.failure
    ? '검토 실패'
    : review.result?.outcome === 'accept'
      ? '수락됨'
      : review.result?.outcome === 'revise'
        ? '수정 요청됨'
        : review.result?.outcome === 'reject'
          ? '거절됨'
          : '검토 대기'
  const pending = !review.result && !review.failure
  return (
    <section className="product-review-card" role="region" aria-label={label}>
      <header>
        <strong>{review.review.summary}</strong>
        <span>{label}</span>
      </header>
      <p>{review.review.question}</p>
      <ol className="semantic-review-change-list">
        {review.review.changes.map((change, index) => (
          <li key={`${change.label}:${index}`}>
            <strong>{change.label}</strong>
            <span>{change.description}</span>
            {change.before !== undefined || change.after !== undefined ? (
              <small>
                {change.before ?? '없음'} → {change.after ?? '없음'}
              </small>
            ) : null}
          </li>
        ))}
      </ol>
      {pending ? (
        <>
          {revising ? (
            <label>
              수정 요청
              <textarea
                value={feedback}
                onChange={(event) => setFeedback(event.target.value)}
              />
            </label>
          ) : null}
          <div className="product-review-actions">
            <button
              type="button"
              disabled={disabled}
              onClick={() => void onReview(review, { outcome: 'accept' })}
            >
              <Check size={14} /> 수락
            </button>
            <button
              type="button"
              disabled={disabled || (revising && !feedback.trim())}
              onClick={() => {
                if (!revising) {
                  setRevising(true)
                  return
                }
                void onReview(review, {
                  outcome: 'revise',
                  feedback: feedback.trim(),
                })
              }}
            >
              수정 요청
            </button>
            <button
              type="button"
              disabled={disabled}
              onClick={() => void onReview(review, { outcome: 'reject' })}
            >
              <X size={14} /> 거절
            </button>
          </div>
        </>
      ) : null}
    </section>
  )
}

function PreparedClarificationCard({
  interaction,
  disabled,
  onAnswer,
  onCancel,
}: {
  readonly interaction: PreparedClarificationEntry
  readonly disabled: boolean
  readonly onAnswer: (
    interaction: PreparedClarificationEntry,
    answers: Readonly<Record<string, readonly string[]>>,
  ) => Promise<void>
  readonly onCancel: (
    interaction: PreparedClarificationEntry,
  ) => Promise<void>
}) {
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const pending = interaction.resolution === undefined
  return (
    <section
      className="product-clarification-card"
      role="region"
      aria-label={pending ? 'AY 질문' : '질문 응답 완료'}
    >
      {interaction.questions.map((question) => (
        <QuestionInput
          key={question.id}
          question={question}
          value={answers[question.id] ?? ''}
          disabled={!pending || disabled}
          onChange={(value) =>
            setAnswers((current) => ({ ...current, [question.id]: value }))
          }
        />
      ))}
      {pending ? (
        <div className="product-review-actions">
          <button
            type="button"
            disabled={
              disabled ||
              interaction.questions.some(
                (question) => !(answers[question.id] ?? '').trim(),
              )
            }
            onClick={() =>
              void onAnswer(
                interaction,
                Object.fromEntries(
                  Object.entries(answers).map(([id, value]) => [
                    id,
                    [value.trim()],
                  ]),
                ),
              )
            }
          >
            답변
          </button>
          <button
            type="button"
            disabled={disabled}
            onClick={() => void onCancel(interaction)}
          >
            취소
          </button>
        </div>
      ) : null}
    </section>
  )
}

function QuestionInput({
  question,
  value,
  disabled,
  onChange,
}: {
  readonly question: TargetProductQuestion
  readonly value: string
  readonly disabled: boolean
  readonly onChange: (value: string) => void
}) {
  return (
    <label>
      <strong>{question.header}</strong>
      <span>{question.question}</span>
      {question.options ? (
        <select
          value={value}
          disabled={disabled}
          onChange={(event) => onChange(event.target.value)}
        >
          <option value="">선택해 주세요</option>
          {question.options.map((option) => (
            <option key={option.label} value={option.label}>
              {option.label}
            </option>
          ))}
        </select>
      ) : (
        <textarea
          value={value}
          disabled={disabled}
          onChange={(event) => onChange(event.target.value)}
        />
      )}
    </label>
  )
}

function phaseLabel(phase: PreparedChatController['state']['phase']): string {
  switch (phase) {
    case 'idle':
      return '대기'
    case 'running':
      return '작업 중'
    case 'awaiting-review':
      return '검토 대기'
    case 'awaiting-clarification':
      return '답변 대기'
    case 'stopping':
      return '중단 중'
    case 'completed':
      return '완료'
    case 'failed':
      return '실패'
    case 'interrupted':
      return '중단됨'
    case 'unknown':
      return '확인 필요'
  }
}
