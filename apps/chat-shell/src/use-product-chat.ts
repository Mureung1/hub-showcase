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
  readonly refreshProductSnapshot: (
    signal?: AbortSignal,
  ) => Promise<ProductBootstrap>
  readonly refreshSettledProductState: (
    signal?: AbortSignal,
  ) => Promise<ProductBootstrap>
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
  const chatAvailable = isProductChatAvailable(
    options.accountReadiness,
    options.workspace,
  )
  const applicationReady = chatAvailable && options.workspace?.course != null
  const canStartAssignment =
    applicationReady &&
    selected.length === 2 &&
    !operationPending &&
    responsePending === undefined
  const canCompose =
    chatAvailable && !operationPending && responsePending === undefined
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
      options.workspace?.recovery !== null ||
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
        reconcileConfirmedReview(review, request.decision)
        releaseResponsePending(pending)
        // The exact Review response already confirms the product decision.
        // Snapshot hydration reports its own failure and cannot hold the Turn.
        await options.refreshProductSnapshot().catch(() => undefined)
      }
    } catch (error) {
      if (request.decision !== 'revise') {
        const decisionConfirmed = await hasConfirmedReviewDecision(
          review,
          request.decision,
        )
        if (decisionConfirmed) {
          reconcileConfirmedReview(review, request.decision)
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
      releaseResponsePending(pending)
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
      releaseResponsePending(pending)
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
      await hydrateSettledWorkspace(controller.signal)
    } catch (error) {
      if (!controller.signal.aborted) {
        if (stateRef.current.phase === 'stream-failed') {
          await hydrateSettledWorkspace(controller.signal)
          return
        }
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
        await hydrateSettledWorkspace(controller.signal)
      }
    } finally {
      if (operationController.current === controller) {
        operationController.current = undefined
      }
      operationPendingRef.current = false
      setOperationPending(false)
    }
  }

  async function hydrateSettledWorkspace(signal: AbortSignal): Promise<void> {
    try {
      await options.refreshSettledProductState(signal)
    } catch {
      // The original stream terminal or request failure remains authoritative.
      // Workspace hydration reports its own state without replacing that error.
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
    try {
      const bootstrap = await options.refreshSettledProductState(signal)
      const run = bootstrap.history.modelingRuns.find(
        (candidate) =>
          candidate.id === active.runId &&
          candidate.actionId === active.operationId,
      )
      if (!run) return false
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
    } catch {
      return false
    }
  }

  async function hasConfirmedReviewDecision(
    review: ProductReviewBinding,
    decision: 'accept' | 'reject',
  ): Promise<boolean> {
    try {
      const bootstrap = await options.refreshProductSnapshot()
      const confirmation = bootstrap.history.userConfirmations.find(
        (candidate) =>
          candidate.patchId === review.patchId &&
          candidate.decision ===
            (decision === 'accept' ? 'accepted' : 'rejected'),
      )
      return confirmation !== undefined
    } catch {
      return false
    }
  }

  function reconcileConfirmedReview(
    review: ProductReviewBinding,
    decision: 'accept' | 'reject',
  ) {
    transition({
      type: 'operation.review-reconciled',
      review,
      outcome: decision === 'accept' ? 'accepted' : 'rejected',
    })
  }

  function releaseResponsePending(expected: ProductResponsePending) {
    if (responsePendingRef.current !== expected) return
    responsePendingRef.current = undefined
    setResponsePending(undefined)
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

export function isProductChatAvailable(
  accountReadiness: ProductAccountReadiness | undefined,
  workspace: ReadyProductWorkspace | undefined,
): boolean {
  return (
    accountReadiness?.state === 'ready' &&
    workspace !== undefined &&
    workspace.recovery === null
  )
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
