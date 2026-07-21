import {
  useLayoutEffect,
  useRef,
  useState,
  type FormEvent,
} from 'react'
import {
  Check,
  Clock3,
  FileText,
  MessageCircle,
  Pencil,
  Send,
  Sparkles,
  Square,
  X,
} from 'lucide-react'

import { PRODUCT_REVIEW_FEEDBACK_MAX_BYTES } from '@ay-ple/product-contract'

import type {
  ProductAccountReadiness,
  ProductRawMaterial,
  ProductSettledHistory,
} from './product-api.js'
import {
  canRespondToProductClarification,
  canRespondToProductReview,
  type ProductChatState,
  type ProductClarificationBinding,
  type ProductReviewBinding,
  type ProductTranscriptEntry,
} from './product-chat-model.js'
import type { ProductEvidenceFocus } from './use-source-workbench.js'
import type { useProductChat } from './use-product-chat.js'

type ProductChatController = ReturnType<typeof useProductChat>

export function ProductChatDock({
  controller,
  accountReadiness,
  history,
  confirmedRevision,
  materials,
  bootstrapRefreshing,
  onNavigateEvidence,
}: {
  readonly controller: ProductChatController
  readonly accountReadiness: ProductAccountReadiness | undefined
  readonly history: ProductSettledHistory | undefined
  readonly confirmedRevision: number | undefined
  readonly materials: readonly ProductRawMaterial[]
  readonly bootstrapRefreshing: boolean
  readonly onNavigateEvidence: (focus: ProductEvidenceFocus) => void
}) {
  const transcriptRef = useRef<HTMLElement | null>(null)
  const previousAssignmentCount = useRef(0)
  const historyObserved = useRef(false)
  const onSubmit = (event: FormEvent) => {
    event.preventDefault()
    void controller.submitMessage()
  }

  useLayoutEffect(() => {
    if (!history) return
    const assignmentCount = history.assignments.length
    if (
      historyObserved.current &&
      assignmentCount > previousAssignmentCount.current
    ) {
      transcriptRef.current?.scrollTo({ top: 0 })
    }
    historyObserved.current = true
    previousAssignmentCount.current = assignmentCount
  }, [history])

  return (
    <div className="chat-shell product-chat-shell">
      <header className="chat-header">
        <div>
          <p className="eyebrow">Companion</p>
          <h2>AY Chat</h2>
        </div>
        <ProductPhasePill phase={controller.state.phase} />
      </header>

      <ProductReadiness readiness={accountReadiness} />

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
        ref={transcriptRef}
        className="transcript-panel product-transcript"
        aria-label="AY 작업 흐름"
        aria-live="polite"
      >
        <SettledAssignments
          history={history}
          confirmedRevision={confirmedRevision}
          materials={materials}
          refreshing={bootstrapRefreshing}
          onNavigateEvidence={onNavigateEvidence}
        />

        {controller.state.transcript.length === 0 ? (
          <div className="product-chat-empty">
            <Sparkles size={24} />
            <strong>자료와 함께 시작해 보세요</strong>
            <span>
              선택한 자료를 정리하거나 궁금한 내용을 메시지로 물어볼 수 있어요.
            </span>
          </div>
        ) : (
          <ol className="product-activity-list">
            {controller.state.transcript.map((entry, index) => (
              <ProductTranscriptRow
                key={`${entry.kind}:${index}`}
                entry={entry}
                activeReview={controller.state.activeOperation?.review}
                activeInteraction={
                  controller.state.activeOperation?.interaction
                }
                clarificationResponseEnabled={
                  canRespondToCurrentClarification(controller.state) &&
                  controller.responsePending === undefined
                }
                reviewResponseEnabled={
                  canRespondToCurrentReview(controller.state) &&
                  controller.responsePending === undefined
                }
                responsePendingId={controller.responsePending?.interactionId}
                reviewPendingDecision={
                  controller.responsePending?.type === 'review'
                    ? controller.responsePending.decision
                    : undefined
                }
                materials={materials}
                onAccept={controller.acceptReview}
                onRevise={controller.reviseReview}
                onReject={controller.rejectReview}
                onAnswer={controller.answerClarification}
                onCancel={controller.cancelClarification}
                onNavigateEvidence={onNavigateEvidence}
              />
            ))}
          </ol>
        )}

        {controller.state.controlFailure ? (
          <div className="product-control-failure" role="alert">
            <strong>요청을 완료하지 못했습니다</strong>
            <span>{controller.state.controlFailure.displayMessage}</span>
          </div>
        ) : null}
        {controller.state.failure ? (
          <div className="product-stream-failure" role="alert">
            <strong>AY 작업을 계속하지 못했습니다</strong>
            <span>{controller.state.failure.displayMessage}</span>
          </div>
        ) : null}
      </section>

      <form className="composer product-composer" onSubmit={onSubmit}>
        <label htmlFor="product-chat-prompt">메시지</label>
        <div className="composer-row">
          <textarea
            id="product-chat-prompt"
            value={controller.draft}
            disabled={!controller.canCompose}
            placeholder={composerPlaceholder(accountReadiness, controller.operationPending)}
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
          <MessageCircle size={12} /> 대화 흐름은 새로고침하면 사라지고,
          반영된 학기 정보만 다시 열립니다.
        </div>
      </form>
    </div>
  )
}

function canRespondToCurrentClarification(state: ProductChatState): boolean {
  const interaction = state.activeOperation?.interaction
  return (
    interaction !== undefined &&
    canRespondToProductClarification(state, interaction)
  )
}

function canRespondToCurrentReview(state: ProductChatState): boolean {
  const review = state.activeOperation?.review
  return review !== undefined && canRespondToProductReview(state, review)
}

function ProductPhasePill({
  phase,
}: {
  readonly phase: ProductChatController['state']['phase']
}) {
  const copy =
    phase === 'awaiting-review'
      ? '검토 대기'
      : phase === 'awaiting-clarification'
        ? '답변 필요'
        : phase === 'submitting' ||
            phase === 'preparing' ||
            phase === 'running'
          ? '작업 중'
          : phase === 'stopping'
            ? '중단 중'
            : phase === 'completed'
              ? '완료'
              : phase === 'idle'
                ? '준비됨'
                : '확인 필요'
  return (
    <span
      className={`product-phase-pill is-${phase}`}
      data-product-operation-phase={phase}
    >
      {copy}
    </span>
  )
}

function ProductReadiness({
  readiness,
}: {
  readonly readiness: ProductAccountReadiness | undefined
}) {
  if (!readiness) {
    return (
      <div className="product-readiness" role="status">
        <Clock3 className="spinning-icon" size={15} /> AY 준비 상태를 확인하고
        있습니다.
      </div>
    )
  }
  if (readiness.state === 'ready') {
    return (
      <div className="product-readiness is-ready" role="status">
        <Check size={15} /> AY를 사용할 수 있습니다.
      </div>
    )
  }
  const readinessClass =
    readiness.state === 'not_ready' ? 'not-ready' : readiness.state
  return (
    <div
      className={`product-readiness is-${readinessClass}`}
      role="status"
    >
      <strong>
        {readiness.state === 'not_ready'
          ? 'Codex 로그인이 필요합니다'
          : 'AY Chat을 사용할 수 없습니다'}
      </strong>
      <span>{readiness.displayMessage}</span>
    </div>
  )
}

function SettledAssignments({
  history,
  confirmedRevision,
  materials,
  refreshing,
  onNavigateEvidence,
}: {
  readonly history: ProductSettledHistory | undefined
  readonly confirmedRevision: number | undefined
  readonly materials: readonly ProductRawMaterial[]
  readonly refreshing: boolean
  readonly onNavigateEvidence: (focus: ProductEvidenceFocus) => void
}) {
  if (!history || history.assignments.length === 0) return null
  return (
    <section className="settled-assignment-list" aria-label="반영된 과제">
      <header>
        <div>
          <span className="state-badge is-applied">반영됨</span>
          <strong>확인된 과제 정보</strong>
        </div>
        {refreshing ? <Clock3 className="spinning-icon" size={14} /> : null}
      </header>
      {history.assignments.map((assignment) => {
        const confirmation = history.userConfirmations.find(
          (candidate) =>
            candidate.assignmentId === assignment.id &&
            candidate.decision === 'accepted' &&
            candidate.outcome === 'applied',
        )
        const appliedPatch = history.statePatches.find(
          (candidate) =>
            candidate.applyOutcome?.type === 'applied' &&
            candidate.applyOutcome.assignmentId === assignment.id,
        )
        return (
          <article className="settled-assignment-card" key={assignment.id}>
            <h3>{assignment.title}</h3>
            <dl className="assignment-values">
              <AssignmentValue label="마감" value={formatDueAt(assignment.dueAt)} />
              <AssignmentValue
                label="제출 방식"
                value={assignment.submissionMethod}
              />
            </dl>
            <div className="settled-proof">
              {confirmation ? <span>학생 확인 완료</span> : null}
              {appliedPatch ? <span>반영 결과 확인됨</span> : null}
              {confirmedRevision !== undefined ? (
                <span>학기 정보 {confirmedRevision}번째 반영</span>
              ) : null}
            </div>
            <EvidenceList
              evidence={assignment.evidence.map((item) => ({
                field: item.field,
                materialId: item.materialId,
                digest: item.digest,
                quote: item.quote,
              }))}
              materials={materials}
              onNavigateEvidence={onNavigateEvidence}
            />
          </article>
        )
      })}
    </section>
  )
}

function ProductTranscriptRow({
  entry,
  activeReview,
  activeInteraction,
  clarificationResponseEnabled,
  reviewResponseEnabled,
  responsePendingId,
  reviewPendingDecision,
  materials,
  onAccept,
  onRevise,
  onReject,
  onAnswer,
  onCancel,
  onNavigateEvidence,
}: {
  readonly entry: ProductTranscriptEntry
  readonly activeReview: ProductReviewBinding | undefined
  readonly activeInteraction: ProductClarificationBinding | undefined
  readonly clarificationResponseEnabled: boolean
  readonly reviewResponseEnabled: boolean
  readonly responsePendingId: string | undefined
  readonly reviewPendingDecision:
    | 'accept'
    | 'revise'
    | 'reject'
    | undefined
  readonly materials: readonly ProductRawMaterial[]
  readonly onAccept: (review: ProductReviewBinding) => Promise<void>
  readonly onRevise: (
    review: ProductReviewBinding,
    feedback: string,
  ) => Promise<void>
  readonly onReject: (review: ProductReviewBinding) => Promise<void>
  readonly onAnswer: ProductChatController['answerClarification']
  readonly onCancel: ProductChatController['cancelClarification']
  readonly onNavigateEvidence: (focus: ProductEvidenceFocus) => void
}) {
  if (entry.kind === 'user') {
    return <li className="product-user-message">{entry.text}</li>
  }
  if (entry.kind === 'operation') {
    return (
      <li className="product-activity-card is-operation">
        <span className="activity-label">자료 정리</span>
        <strong>
          {entry.operationKind === 'assignment'
            ? '선택한 자료 정리하기'
            : 'AY에게 메시지 보내기'}
        </strong>
        <div className="operation-milestones" aria-label="작업 진행 단계">
          {entry.milestones.map((milestone) => (
            <span key={milestone}>
              {milestone === 'submitting'
                ? '요청함'
                : milestone === 'preparing'
                  ? '자료 준비'
                  : '시작됨'}
            </span>
          ))}
        </div>
      </li>
    )
  }
  if (entry.kind === 'skill') {
    return (
      <li className="product-activity-card is-skill">
        <span className="activity-label">Skill</span>
        <strong>{entry.name}</strong>
        <span>버전 {entry.version} 작업 방식을 요청했습니다.</span>
      </li>
    )
  }
  if (entry.kind === 'plan' || entry.kind === 'agent') {
    return (
      <li className={`product-activity-card is-${entry.kind}`}>
        <span className="activity-label">
          {entry.kind === 'plan' ? '계획' : 'AY'}
        </span>
        <p>{entry.text || '내용을 준비하고 있습니다.'}</p>
        {entry.status === 'streaming' ? (
          <span className="activity-streaming">작성 중</span>
        ) : null}
      </li>
    )
  }
  if (entry.kind === 'mcp') {
    return (
      <li className={`product-activity-card is-mcp is-${entry.status}`}>
        <span className="activity-label">변경 제안 도구</span>
        <strong>
          {entry.status === 'running'
            ? '자료 근거를 확인하고 있습니다'
            : entry.status === 'completed'
              ? '근거가 연결된 변경 제안을 준비했습니다'
              : '변경 제안을 준비하지 못했습니다'}
        </strong>
        {entry.displayMessage ? <span>{entry.displayMessage}</span> : null}
      </li>
    )
  }
  if (entry.kind === 'clarification') {
    const active =
      activeInteraction?.operationId === entry.operationId &&
      activeInteraction.interactionId === entry.interactionId
    return (
      <li>
        <ClarificationCard
          interaction={entry}
          active={active}
          responseEnabled={clarificationResponseEnabled}
          pending={responsePendingId === entry.interactionId}
          onAnswer={onAnswer}
          onCancel={onCancel}
        />
      </li>
    )
  }
  if (entry.kind === 'review') {
    const active =
      activeReview?.operationId === entry.operationId &&
      activeReview.interactionId === entry.interactionId &&
      activeReview.patchId === entry.patchId &&
      activeReview.decisionKey === entry.decisionKey
    return (
      <li>
        <ReviewCard
          review={entry}
          active={active}
          responseEnabled={reviewResponseEnabled}
          pending={responsePendingId === entry.interactionId}
          pendingDecision={
            responsePendingId === entry.interactionId
              ? reviewPendingDecision
              : undefined
          }
          materials={materials}
          onAccept={onAccept}
          onRevise={onRevise}
          onReject={onReject}
          onNavigateEvidence={onNavigateEvidence}
        />
      </li>
    )
  }
  if (entry.kind === 'notice') {
    return (
      <li className="product-activity-card is-notice">
        <strong>{entry.willRetry ? '다시 시도하고 있습니다' : '작업 안내'}</strong>
        <span>{entry.displayMessage}</span>
      </li>
    )
  }
  if (entry.kind !== 'terminal') return null
  return (
    <li className={`product-terminal is-${entry.status}`}>
      <strong>{terminalCopy(entry)}</strong>
      {entry.validationOutcome === 'failed' ? (
        <span>변경 제안을 확인하지 못해 학기 정보에는 반영하지 않았습니다.</span>
      ) : null}
    </li>
  )
}

type ReviewOutcome = NonNullable<
  Extract<ProductTranscriptEntry, { readonly kind: 'review' }>['outcome']
>

type ReviewPresentationState = ReviewOutcome | 'pending'

const reviewPresentationByState = {
  pending: {
    status: '검토 대기',
    badgeClass: 'is-pending',
    resolution: null,
  },
  accepted: {
    status: '검토 완료',
    badgeClass: 'is-applied',
    resolution: {
      icon: 'check',
      copy: '검토 응답을 전달했습니다.',
    },
  },
  revised: {
    status: '수정 요청됨',
    badgeClass: 'is-revised',
    resolution: {
      icon: 'check',
      copy: '수정 요청을 전달했습니다. 새 변경 제안을 기다립니다.',
    },
  },
  rejected: {
    status: '거절됨',
    badgeClass: 'is-rejected',
    resolution: {
      icon: 'x',
      copy: '변경 제안을 반영하지 않았습니다.',
    },
  },
  cancelled: {
    status: '검토 종료',
    badgeClass: 'is-rejected',
    resolution: {
      icon: 'check',
      copy: '검토가 종료되었습니다.',
    },
  },
} as const satisfies Record<
  ReviewPresentationState,
  {
    readonly status: string
    readonly badgeClass:
      | 'is-pending'
      | 'is-applied'
      | 'is-revised'
      | 'is-rejected'
    readonly resolution: {
      readonly icon: 'check' | 'x'
      readonly copy: string
    } | null
  }
>

function ReviewCard({
  review,
  active,
  responseEnabled,
  pending,
  pendingDecision,
  materials,
  onAccept,
  onRevise,
  onReject,
  onNavigateEvidence,
}: {
  readonly review: Extract<ProductTranscriptEntry, { readonly kind: 'review' }>
  readonly active: boolean
  readonly responseEnabled: boolean
  readonly pending: boolean
  readonly pendingDecision: 'accept' | 'revise' | 'reject' | undefined
  readonly materials: readonly ProductRawMaterial[]
  readonly onAccept: (review: ProductReviewBinding) => Promise<void>
  readonly onRevise: (
    review: ProductReviewBinding,
    feedback: string,
  ) => Promise<void>
  readonly onReject: (review: ProductReviewBinding) => Promise<void>
  readonly onNavigateEvidence: (focus: ProductEvidenceFocus) => void
}) {
  const [feedback, setFeedback] = useState('')
  const feedbackBytes = utf8Bytes(feedback)
  const feedbackValid =
    feedback.trim().length > 0 &&
    feedbackBytes <= PRODUCT_REVIEW_FEEDBACK_MAX_BYTES
  const presentation =
    reviewPresentationByState[review.outcome ?? 'pending']
  return (
    <section className="review-card" aria-label={presentation.status}>
      <header>
        <span className={`state-badge ${presentation.badgeClass}`}>
          {presentation.status}
        </span>
        <strong>변경 제안</strong>
      </header>
      <p>{review.patch.summary}</p>
      <dl className="assignment-values review-values">
        <AssignmentValue
          label="과제명"
          value={review.patch.changes.values.title}
        />
        <AssignmentValue
          label="마감"
          value={formatDueAt(review.patch.changes.values.dueAt)}
        />
        <AssignmentValue
          label="제출 방식"
          value={review.patch.changes.values.submissionMethod}
        />
      </dl>
      <EvidenceList
        evidence={review.patch.evidence.map((item) => ({
          field: item.field,
          materialId: item.rawMaterialId,
          digest: item.digest,
          quote: item.quote,
        }))}
        materials={materials}
        onNavigateEvidence={onNavigateEvidence}
      />
      {presentation.resolution ? (
        <div className="review-resolution">
          {presentation.resolution.icon === 'x' ? (
            <X size={15} />
          ) : (
            <Check size={15} />
          )}
          {presentation.resolution.copy}
        </div>
      ) : active ? (
        <div className="review-controls">
          <label
            className="review-feedback"
            htmlFor={`review-feedback-${review.interactionId}`}
          >
            수정 요청 내용
            <textarea
              id={`review-feedback-${review.interactionId}`}
              value={feedback}
              rows={3}
              maxLength={PRODUCT_REVIEW_FEEDBACK_MAX_BYTES}
              disabled={pending || !responseEnabled}
              aria-describedby={`review-feedback-limit-${review.interactionId}`}
              onChange={(event) => setFeedback(event.target.value)}
            />
          </label>
          <span
            id={`review-feedback-limit-${review.interactionId}`}
            className={`review-feedback-limit ${
              feedbackBytes > PRODUCT_REVIEW_FEEDBACK_MAX_BYTES ? 'is-over' : ''
            }`}
          >
            수정 요청은 {PRODUCT_REVIEW_FEEDBACK_MAX_BYTES.toLocaleString()}{' '}
            bytes까지 입력할 수 있어요.
          </span>
          <div className="review-actions">
            <button
              className="accept-review-button"
              type="button"
              disabled={pending || !responseEnabled}
              onClick={() => void onAccept(review)}
            >
              {pendingDecision === 'accept' ? (
                <Clock3 className="spinning-icon" size={15} />
              ) : (
                <Check size={15} />
              )}
              {pendingDecision === 'accept' ? '반영 결과 확인 중' : '수락'}
            </button>
            <button
              className="revise-review-button"
              type="button"
              disabled={pending || !responseEnabled || !feedbackValid}
              onClick={() => void onRevise(review, feedback)}
            >
              {pendingDecision === 'revise' ? (
                <Clock3 className="spinning-icon" size={15} />
              ) : (
                <Pencil size={15} />
              )}
              {pendingDecision === 'revise'
                ? '수정 요청 전달 중'
                : 'AY에게 수정 요청'}
            </button>
            <button
              className="reject-review-button"
              type="button"
              disabled={pending || !responseEnabled}
              onClick={() => void onReject(review)}
            >
              {pendingDecision === 'reject' ? (
                <Clock3 className="spinning-icon" size={15} />
              ) : (
                <X size={15} />
              )}
              {pendingDecision === 'reject' ? '거절 처리 중' : '거절'}
            </button>
          </div>
        </div>
      ) : null}
    </section>
  )
}

function utf8Bytes(value: string): number {
  return new TextEncoder().encode(value).byteLength
}

function ClarificationCard({
  interaction,
  active,
  responseEnabled,
  pending,
  onAnswer,
  onCancel,
}: {
  readonly interaction: Extract<
    ProductTranscriptEntry,
    { readonly kind: 'clarification' }
  >
  readonly active: boolean
  readonly responseEnabled: boolean
  readonly pending: boolean
  readonly onAnswer: ProductChatController['answerClarification']
  readonly onCancel: ProductChatController['cancelClarification']
}) {
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const complete = interaction.questions.every(
    (question) => answers[question.id]?.trim(),
  )

  if (interaction.resolution) {
    return (
      <section className="clarification-card is-resolved" aria-label="AY 질문">
        <strong>
          {interaction.resolution === 'answered'
            ? '질문에 답했습니다'
            : '질문을 취소했습니다'}
        </strong>
      </section>
    )
  }

  return (
    <section className="clarification-card" aria-label="AY 질문">
      <span className="state-badge is-question">답변 필요</span>
      {interaction.questions.map((question) => (
        <fieldset
          key={question.id}
          disabled={!active || pending || !responseEnabled}
        >
          <legend>{question.header}</legend>
          <p>{question.question}</p>
          {question.options ? (
            <div className="question-options">
              {question.options.map((option) => (
                <label key={option.label}>
                  <input
                    type="radio"
                    name={question.id}
                    value={option.label}
                    checked={answers[question.id] === option.label}
                    onChange={() =>
                      setAnswers((current) => ({
                        ...current,
                        [question.id]: option.label,
                      }))
                    }
                  />
                  <span>
                    <strong>{option.label}</strong>
                    <small>{option.description}</small>
                  </span>
                </label>
              ))}
            </div>
          ) : null}
          {question.acceptsFreeform ? (
            <label className="question-freeform">
              직접 답하기
              <input
                value={answers[question.id] ?? ''}
                onChange={(event) =>
                  setAnswers((current) => ({
                    ...current,
                    [question.id]: event.target.value,
                  }))
                }
              />
            </label>
          ) : null}
        </fieldset>
      ))}
      {active ? (
        <div className="clarification-actions">
          <button
            type="button"
            disabled={!complete || pending || !responseEnabled}
            onClick={() =>
              void onAnswer(
                interaction,
                Object.fromEntries(
                  interaction.questions.map((question) => [
                    question.id,
                    [answers[question.id]!.trim()],
                  ]),
                ),
              )
            }
          >
            질문 답변 보내기
          </button>
          <button
            type="button"
            disabled={pending || !responseEnabled}
            onClick={() => void onCancel(interaction)}
          >
            질문 취소
          </button>
        </div>
      ) : null}
    </section>
  )
}

function EvidenceList({
  evidence,
  materials,
  onNavigateEvidence,
}: {
  readonly evidence: readonly {
    readonly field: 'title' | 'dueAt' | 'submissionMethod'
    readonly materialId: string
    readonly digest: string
    readonly quote: string
  }[]
  readonly materials: readonly ProductRawMaterial[]
  readonly onNavigateEvidence: (focus: ProductEvidenceFocus) => void
}) {
  return (
    <div className="evidence-list" aria-label="원문 근거">
      {evidence.map((item, index) => {
        const material = materials.find(
          (candidate) =>
            candidate.id === item.materialId &&
            candidate.digest === item.digest,
        )
        if (!material) return null
        return (
          <button
            type="button"
            className="evidence-button"
            key={`${item.field}:${item.materialId}:${index}`}
            aria-label={`${fieldLabel(item.field)} 근거 보기`}
            onClick={() =>
              onNavigateEvidence({
                materialId: item.materialId,
                digest: item.digest,
                quote: item.quote,
              })
            }
          >
            <FileText size={14} />
            <span>
              <strong>{fieldLabel(item.field)} 근거</strong>
              <small>{material.relativePath}</small>
              <q>{item.quote}</q>
            </span>
          </button>
        )
      })}
    </div>
  )
}

function AssignmentValue({
  label,
  value,
}: {
  readonly label: string
  readonly value: string
}) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  )
}

function fieldLabel(field: 'title' | 'dueAt' | 'submissionMethod'): string {
  if (field === 'title') return '과제명'
  if (field === 'dueAt') return '마감'
  return '제출 방식'
}

function formatDueAt(value: string): string {
  const match =
    /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::\d{2})?([+-]\d{2}:\d{2}|Z)$/.exec(
      value,
    )
  if (!match) return value
  const [, year, month, day, hour, minute, offset] = match
  return `${year}년 ${Number(month)}월 ${Number(day)}일 ${hour}:${minute}${offset === '+09:00' ? ' KST' : ` ${offset}`}`
}

function terminalCopy(
  entry: Extract<ProductTranscriptEntry, { readonly kind: 'terminal' }>,
): string {
  if (entry.status === 'completed' && entry.validationOutcome !== 'failed') {
    return 'AY 작업을 완료했습니다.'
  }
  if (entry.status === 'interrupted') return 'AY 작업을 중단했습니다.'
  if (entry.status === 'unknown' || entry.status === 'acceptance_unknown') {
    return '작업 결과를 확정하지 못했습니다.'
  }
  if (entry.status === 'not_accepted') return 'AY 작업을 시작하지 못했습니다.'
  return 'AY 작업을 완료하지 못했습니다.'
}

function composerPlaceholder(
  readiness: ProductAccountReadiness | undefined,
  pending: boolean,
): string {
  if (readiness?.state === 'not_ready') return 'Codex 로그인 후 메시지를 보낼 수 있어요.'
  if (readiness?.state === 'unavailable') return 'AY Chat 연결을 확인해 주세요.'
  if (pending) return '현재 AY 작업이 끝난 뒤 메시지를 보낼 수 있어요.'
  return 'AY에게 자료나 과제에 관해 물어보세요.'
}
