import { useCallback, useEffect, useRef, useState } from 'react'

import {
  FIRST_ASSIGNMENT_ARGUMENTS,
  FIRST_ASSIGNMENT_RECIPE_VERSION,
} from '@ay-ple/product-contract'

import {
  answerProductInteraction,
  cancelProductInteraction,
  interruptProductOperation,
  ProductApiError,
  ProductStreamError,
  streamFirstAssignment,
  streamFirstAssignmentRetry,
  streamProductChat,
  submitProductReview,
  type ProductAccountReadiness,
  type ProductBootstrap,
  type ProductInteractionAnswerRequest,
  type ProductMaterialSelection,
  type ProductRawMaterial,
  type ProductReviewRequest,
  type ProductReviewResponse,
  type ProductSettledModelingRun,
  type ReadyProductWorkspace,
} from './product-api.js'
import {
  canRespondToProductClarification,
  canRespondToProductReview,
  createInitialProductChatState,
  isProductOperationActive,
  reduceProductChatState,
  type ProductChatAction,
  type ProductChatFailure,
  type ProductClarificationBinding,
  type ProductReviewBinding,
} from './product-chat-model.js'

export function useProductChat(options: {
  readonly accountReadiness: ProductAccountReadiness | undefined
  readonly workspace: ReadyProductWorkspace | undefined
  readonly selectedMaterials: readonly ProductRawMaterial[]
  readonly refreshProductState: () => Promise<ProductBootstrap>
}) {
  const [state, setState] = useState(createInitialProductChatState)
  const stateRef = useRef(state)
  const [draft, setDraft] = useState('')
  const [operationPending, setOperationPending] = useState(false)
  const operationPendingRef = useRef(false)
  const [responsePending, setResponsePending] =
    useState<ProductResponsePending>()
  const responsePendingRef = useRef<ProductResponsePending | undefined>(
    undefined,
  )
  const operationController = useRef<AbortController | undefined>(undefined)

  const transition = useCallback((action: ProductChatAction) => {
    const next = reduceProductChatState(stateRef.current, action)
    stateRef.current = next
    setState(next)
    return next
  }, [])

  useEffect(
    () => () => {
      operationController.current?.abort()
    },
    [],
  )

  const selected = materialSelection(options.selectedMaterials)
  const accountReady = options.accountReadiness?.state === 'ready'
  const applicationReady = accountReady && options.workspace?.course != null
  const canStartAssignment =
    applicationReady &&
    selected.length === 2 &&
    !operationPending &&
    responsePending === undefined
  const canCompose =
    applicationReady && !operationPending && responsePending === undefined
  const canSubmit = canCompose && draft.trim().length > 0
  const canInterrupt =
    operationPending &&
    responsePending === undefined &&
    state.activeOperation?.accepted === true &&
    state.phase !== 'stopping'

  async function startAssignment() {
    const course = options.workspace?.course
    if (!canStartAssignment || !course) return
    await runOperation(
      'assignment',
      undefined,
      (onFrame, signal) =>
        streamFirstAssignment(
          {
            courseId: course.id,
            recipeVersion: FIRST_ASSIGNMENT_RECIPE_VERSION,
            arguments: FIRST_ASSIGNMENT_ARGUMENTS,
            materials: selected,
          },
          onFrame,
          signal,
        ),
    )
  }

  async function retryAssignment(run: ProductSettledModelingRun) {
    const course = options.workspace?.course
    if (
      !course ||
      course.id !== run.courseId ||
      !run.recovery?.retryable ||
      operationPendingRef.current ||
      isProductOperationActive(stateRef.current)
    ) {
      return
    }
    const materials = run.sources.map((source) => ({
      id: source.materialId,
      digest: source.digest,
    }))
    const sourcesAvailable = materials.every((source) =>
      options.workspace?.materials.some(
        (material) =>
          material.id === source.id && material.digest === source.digest,
      ),
    )
    if (!sourcesAvailable) return
    await runOperation(
      'assignment',
      undefined,
      (onFrame, signal) =>
        streamFirstAssignmentRetry(
          {
            courseId: run.courseId,
            recipeVersion: FIRST_ASSIGNMENT_RECIPE_VERSION,
            arguments: FIRST_ASSIGNMENT_ARGUMENTS,
            materials,
            retryOfRunId: run.id,
          },
          onFrame,
          signal,
        ),
      materials,
    )
  }

  async function submitMessage() {
    const text = draft.trim()
    if (!canSubmit || !text) return
    setDraft('')
    await runOperation('chat', text, (onFrame, signal) =>
      streamProductChat({ text, materials: selected }, onFrame, signal),
    )
  }

  async function acceptReview(review: ProductReviewBinding) {
    await respondToReview(review, {
      patchId: review.patchId,
      decisionKey: review.decisionKey,
      decision: 'accept',
    })
  }

  async function reviseReview(
    review: ProductReviewBinding,
    feedback: string,
  ) {
    await respondToReview(review, {
      patchId: review.patchId,
      decisionKey: review.decisionKey,
      decision: 'revise',
      feedback: feedback.trim(),
    })
  }

  async function rejectReview(review: ProductReviewBinding) {
    await respondToReview(review, {
      patchId: review.patchId,
      decisionKey: review.decisionKey,
      decision: 'reject',
    })
  }

  async function respondToReview(
    review: ProductReviewBinding,
    request: ProductReviewRequest,
  ) {
    if (
      responsePendingRef.current ||
      !canRespondToProductReview(stateRef.current, review)
    ) {
      return
    }
    transition({ type: 'operation.control-cleared' })
    const pending = {
      type: 'review',
      interactionId: review.interactionId,
      decision: request.decision,
    } as const satisfies ProductResponsePending
    responsePendingRef.current = pending
    setResponsePending(pending)
    try {
      const response = await submitProductReview(review.interactionId, request)
      if (!matchesReviewResponse(review, request, response)) {
        throw new ProductStreamError()
      }
      if (request.decision !== 'revise') {
        await options.refreshProductState()
        if (response.continuation === 'lost') {
          reconcileConfirmedReview(
            review,
            request.decision,
            response.confirmedRevision,
          )
        }
      }
    } catch (error) {
      if (request.decision !== 'revise') {
        const confirmedRevision = await confirmedReviewRevision(
          review,
          request.decision,
        )
        if (confirmedRevision !== undefined) {
          reconcileConfirmedReview(
            review,
            request.decision,
            confirmedRevision,
          )
          return
        }
      }
      transition({
        type: 'operation.control-failed',
        failure: safeFailure(
          error,
          reviewFailureMessage(request.decision),
        ),
      })
    } finally {
      if (responsePendingRef.current === pending) {
        responsePendingRef.current = undefined
        setResponsePending(undefined)
      }
    }
  }

  async function answerClarification(
    interaction: ProductClarificationBinding,
    answers: ProductInteractionAnswerRequest['answers'],
  ) {
    await respondToClarification(
      interaction,
      () =>
        answerProductInteraction(
          interaction.operationId,
          interaction.interactionId,
          { answers },
        ),
      '질문 답변을 전달하지 못했습니다.',
    )
  }

  async function cancelClarification(
    interaction: ProductClarificationBinding,
  ) {
    await respondToClarification(
      interaction,
      () =>
        cancelProductInteraction(
          interaction.operationId,
          interaction.interactionId,
        ),
      '질문을 취소하지 못했습니다.',
    )
  }

  async function respondToClarification(
    interaction: ProductClarificationBinding,
    respond: () => Promise<void>,
    fallbackMessage: string,
  ) {
    if (
      responsePendingRef.current ||
      !canRespondToProductClarification(stateRef.current, interaction)
    ) {
      return
    }
    transition({ type: 'operation.control-cleared' })
    const pending = {
      type: 'clarification',
      interactionId: interaction.interactionId,
    } as const satisfies ProductResponsePending
    responsePendingRef.current = pending
    setResponsePending(pending)
    try {
      await respond()
    } catch (error) {
      transition({
        type: 'operation.control-failed',
        failure: safeFailure(error, fallbackMessage),
      })
    } finally {
      if (responsePendingRef.current === pending) {
        responsePendingRef.current = undefined
        setResponsePending(undefined)
      }
    }
  }

  async function interrupt() {
    const operationId = stateRef.current.activeOperation?.operationId
    if (!canInterrupt || !operationId) return
    transition({ type: 'operation.interrupt-requested', operationId })
    try {
      await interruptProductOperation(operationId)
    } catch (error) {
      transition({
        type: 'operation.interrupt-failed',
        operationId,
        failure: safeFailure(error, '작업 중단 요청을 전달하지 못했습니다.'),
      })
    }
  }

  async function runOperation(
    kind: 'assignment' | 'chat',
    text: string | undefined,
    stream: (
      onFrame: Parameters<typeof streamFirstAssignment>[1],
      signal: AbortSignal,
    ) => Promise<void>,
    operationMaterials: readonly ProductMaterialSelection[] = selected,
  ) {
    if (operationPendingRef.current || isProductOperationActive(stateRef.current)) {
      return
    }
    operationPendingRef.current = true
    setOperationPending(true)
    const controller = new AbortController()
    operationController.current = controller
    transition({
      type: 'operation.started',
      kind,
      materials: operationMaterials,
      ...(text === undefined ? {} : { text }),
    })
    try {
      await stream(
        (frame) => {
          const next = transition({ type: 'operation.frame', frame })
          if (next.phase === 'stream-failed') throw new ProductStreamError()
        },
        controller.signal,
      )
      if (
        kind === 'assignment' &&
        isProductOperationActive(stateRef.current) &&
        (await reconcileLostAssignment(controller.signal))
      ) {
        return
      }
      transition({ type: 'operation.stream-ended' })
      if (kind === 'assignment') await options.refreshProductState()
    } catch (error) {
      if (!controller.signal.aborted) {
        if (stateRef.current.phase === 'stream-failed') return
        if (
          kind === 'assignment' &&
          stateRef.current.activeOperation?.stage !== 'submitting' &&
          (await reconcileLostAssignment(controller.signal))
        ) {
          return
        }
        transition(
          stateRef.current.activeOperation?.stage === 'submitting'
            ? {
                type: 'operation.request-failed',
                failure: safeFailure(error, 'AY 작업을 시작하지 못했습니다.'),
              }
            : { type: 'operation.stream-failed' },
        )
      }
    } finally {
      if (operationController.current === controller) {
        operationController.current = undefined
      }
      operationPendingRef.current = false
      setOperationPending(false)
    }
  }

  async function reconcileLostAssignment(signal: AbortSignal) {
    const active = stateRef.current.activeOperation
    if (
      active?.kind !== 'assignment' ||
      !active.operationId ||
      !active.runId
    ) {
      return false
    }
    for (let attempt = 0; attempt < 50 && !signal.aborted; attempt += 1) {
      try {
        const bootstrap = await options.refreshProductState()
        const run = bootstrap.history.modelingRuns.find(
          (candidate) =>
            candidate.id === active.runId &&
            candidate.actionId === active.operationId,
        )
        if (run) {
          if (run.recovery) {
            transition({
              type: 'operation.frame',
              frame: {
                type: 'operation.recovery',
                operationId: run.actionId,
                runId: run.id,
                ...run.recovery,
              },
            })
          }
          transition({
            type: 'operation.frame',
            frame: {
              type: 'operation.terminal',
              operationId: run.actionId,
              runId: run.id,
              status: run.status,
              validationOutcome: run.validationOutcome,
            },
          })
          return stateRef.current.phase !== 'stream-failed'
        }
      } catch {
        // A bounded later read may observe settlement after the lease drains.
      }
      await waitForRecoveryPoll()
    }
    return false
  }

  async function confirmedReviewRevision(
    review: ProductReviewBinding,
    decision: 'accept' | 'reject',
  ): Promise<number | undefined> {
    try {
      const bootstrap = await options.refreshProductState()
      const confirmation = bootstrap.history.userConfirmations.find(
        (candidate) =>
          candidate.patchId === review.patchId &&
          candidate.decision ===
            (decision === 'accept' ? 'accepted' : 'rejected'),
      )
      if (!confirmation) return undefined
      if (confirmation.resultingRevision !== null) {
        return confirmation.resultingRevision
      }
      return bootstrap.workspace?.state === 'ready'
        ? bootstrap.workspace.confirmedRevision
        : undefined
    } catch {
      return undefined
    }
  }

  function reconcileConfirmedReview(
    review: ProductReviewBinding,
    decision: 'accept' | 'reject',
    confirmedRevision: number,
  ) {
    transition({
      type: 'operation.review-reconciled',
      review,
      outcome: decision === 'accept' ? 'accepted' : 'rejected',
    })
    const lastAssignment = stateRef.current.lastAssignment
    if (
      lastAssignment?.operationId !== review.operationId ||
      stateRef.current.recovery?.outcome === 'continuation_lost'
    ) {
      return
    }
    transition({
      type: 'operation.frame',
      frame: {
        type: 'operation.recovery',
        operationId: lastAssignment.operationId,
        runId: lastAssignment.runId,
        outcome: 'continuation_lost',
        retryable: false,
        confirmedRevision,
      },
    })
  }

  return {
    state,
    draft,
    setDraft,
    operationPending,
    responsePending,
    accountReady,
    canStartAssignment,
    canCompose,
    canSubmit,
    canInterrupt,
    startAssignment,
    retryAssignment,
    submitMessage,
    acceptReview,
    reviseReview,
    rejectReview,
    answerClarification,
    cancelClarification,
    interrupt,
  }
}

function waitForRecoveryPoll(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 100))
}

type ProductResponsePending =
  | {
      readonly type: 'review'
      readonly interactionId: string
      readonly decision: ProductReviewRequest['decision']
    }
  | { readonly type: 'clarification'; readonly interactionId: string }

function matchesReviewResponse(
  review: ProductReviewBinding,
  request: ProductReviewRequest,
  response: ProductReviewResponse,
): boolean {
  if (
    response.patchId !== review.patchId ||
    response.decisionKey !== review.decisionKey
  ) {
    return false
  }
  if (request.decision === 'accept') {
    return response.decision === 'accepted' && response.outcome === 'applied'
  }
  if (request.decision === 'reject') {
    return (
      response.decision === 'rejected' && response.outcome === 'not_applied'
    )
  }
  return (
    response.decision === 'revision_requested' &&
    response.outcome === 'replacement_pending'
  )
}

function reviewFailureMessage(
  decision: ProductReviewRequest['decision'],
): string {
  if (decision === 'revise') {
    return '수정 요청을 전달하지 못했습니다. 현재 변경 제안을 다시 확인해 주세요.'
  }
  if (decision === 'reject') {
    return '변경 제안의 거절 결과를 확인하지 못했습니다. 새로고침한 뒤 확인해 주세요.'
  }
  return '변경 제안의 반영 결과를 확인하지 못했습니다. 새로고침한 뒤 확인해 주세요.'
}

function materialSelection(
  materials: readonly ProductRawMaterial[],
): readonly ProductMaterialSelection[] {
  return materials.map((material) => ({
    id: material.id,
    digest: material.digest,
  }))
}

function safeFailure(
  error: unknown,
  fallback: string,
): ProductChatFailure {
  return error instanceof ProductApiError
    ? { code: error.code, displayMessage: error.displayMessage }
    : { code: 'request_failed', displayMessage: fallback }
}
