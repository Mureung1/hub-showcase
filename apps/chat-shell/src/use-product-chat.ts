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
  streamProductChat,
  submitProductReview,
  type ProductAccountReadiness,
  type ProductBootstrap,
  type ProductInteractionAnswerRequest,
  type ProductMaterialSelection,
  type ProductRawMaterial,
  type ReadyProductWorkspace,
} from './product-api.js'
import {
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
  const [responsePendingId, setResponsePendingId] = useState<string>()
  const responsePendingRef = useRef<string | undefined>(undefined)
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
    responsePendingId === undefined
  const canCompose =
    applicationReady && !operationPending && responsePendingId === undefined
  const canSubmit = canCompose && draft.trim().length > 0
  const canInterrupt =
    operationPending &&
    responsePendingId === undefined &&
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

  async function submitMessage() {
    const text = draft.trim()
    if (!canSubmit || !text) return
    setDraft('')
    await runOperation('chat', text, (onFrame, signal) =>
      streamProductChat({ text, materials: selected }, onFrame, signal),
    )
  }

  async function acceptReview(review: ProductReviewBinding) {
    if (
      responsePendingRef.current ||
      !sameReview(stateRef.current.activeOperation?.review, review)
    ) {
      return
    }
    transition({ type: 'operation.control-cleared' })
    responsePendingRef.current = review.interactionId
    setResponsePendingId(review.interactionId)
    try {
      const response = await submitProductReview(review.interactionId, {
        patchId: review.patchId,
        decisionKey: review.decisionKey,
        decision: 'accept',
      })
      if (
        response.patchId !== review.patchId ||
        response.decisionKey !== review.decisionKey ||
        response.decision !== 'accepted' ||
        response.outcome !== 'applied'
      ) {
        throw new ProductStreamError()
      }
      await options.refreshProductState()
    } catch (error) {
      transition({
        type: 'operation.control-failed',
        failure: safeFailure(
          error,
          '변경 제안의 반영 결과를 확인하지 못했습니다. 새로고침한 뒤 확인해 주세요.',
        ),
      })
    } finally {
      responsePendingRef.current = undefined
      setResponsePendingId(undefined)
    }
  }

  async function answerClarification(
    interaction: ProductClarificationBinding,
    answers: ProductInteractionAnswerRequest['answers'],
  ) {
    if (
      responsePendingRef.current ||
      !sameInteraction(
        stateRef.current.activeOperation?.interaction,
        interaction,
      )
    ) {
      return
    }
    transition({ type: 'operation.control-cleared' })
    responsePendingRef.current = interaction.interactionId
    setResponsePendingId(interaction.interactionId)
    try {
      await answerProductInteraction(
        interaction.operationId,
        interaction.interactionId,
        { answers },
      )
    } catch (error) {
      transition({
        type: 'operation.control-failed',
        failure: safeFailure(error, '질문 답변을 전달하지 못했습니다.'),
      })
    } finally {
      responsePendingRef.current = undefined
      setResponsePendingId(undefined)
    }
  }

  async function cancelClarification(
    interaction: ProductClarificationBinding,
  ) {
    if (
      responsePendingRef.current ||
      !sameInteraction(
        stateRef.current.activeOperation?.interaction,
        interaction,
      )
    ) {
      return
    }
    transition({ type: 'operation.control-cleared' })
    responsePendingRef.current = interaction.interactionId
    setResponsePendingId(interaction.interactionId)
    try {
      await cancelProductInteraction(
        interaction.operationId,
        interaction.interactionId,
      )
    } catch (error) {
      transition({
        type: 'operation.control-failed',
        failure: safeFailure(error, '질문을 취소하지 못했습니다.'),
      })
    } finally {
      responsePendingRef.current = undefined
      setResponsePendingId(undefined)
    }
  }

  async function interrupt() {
    const operationId = stateRef.current.activeOperation?.operationId
    if (!canInterrupt || !operationId) return
    transition({ type: 'operation.interrupt-requested' })
    try {
      await interruptProductOperation(operationId)
    } catch (error) {
      transition({
        type: 'operation.control-failed',
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
      materials: selected,
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
      transition({ type: 'operation.stream-ended' })
    } catch (error) {
      if (!controller.signal.aborted) {
        if (stateRef.current.phase === 'stream-failed') return
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

  return {
    state,
    draft,
    setDraft,
    operationPending,
    responsePendingId,
    accountReady,
    canStartAssignment,
    canCompose,
    canSubmit,
    canInterrupt,
    startAssignment,
    submitMessage,
    acceptReview,
    answerClarification,
    cancelClarification,
    interrupt,
  }
}

function materialSelection(
  materials: readonly ProductRawMaterial[],
): readonly ProductMaterialSelection[] {
  return materials.map((material) => ({
    id: material.id,
    digest: material.digest,
  }))
}

function sameReview(
  current: ProductReviewBinding | undefined,
  expected: ProductReviewBinding,
): boolean {
  return (
    current?.operationId === expected.operationId &&
    current.interactionId === expected.interactionId &&
    current.patchId === expected.patchId &&
    current.decisionKey === expected.decisionKey
  )
}

function sameInteraction(
  current: ProductClarificationBinding | undefined,
  expected: ProductClarificationBinding,
): boolean {
  return (
    current?.operationId === expected.operationId &&
    current.interactionId === expected.interactionId
  )
}

function safeFailure(
  error: unknown,
  fallback: string,
): ProductChatFailure {
  return error instanceof ProductApiError
    ? { code: error.code, displayMessage: error.displayMessage }
    : { code: 'request_failed', displayMessage: fallback }
}
