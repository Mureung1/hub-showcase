import { useCallback, useEffect, useRef, useState } from 'react'

import type {
  BrowserSafeSemanticReview,
  ProductAccountReadiness,
  ProductReviewResult,
  TargetProductQuestion,
  TargetProductBootstrap,
} from '@ay-ple/product-contract'

import {
  PreparedProductApiError,
  answerPreparedInteraction,
  cancelPreparedInteraction,
  fetchPreparedCodexSettings,
  interruptPreparedOperation,
  streamPreparedChat,
  submitPreparedReview,
  type PreparedProductFrame,
} from './prepared-product-api.js'

export type PreparedSemanticReviewEntry = {
  readonly kind: 'semantic-review'
  readonly operationId: string
  readonly interactionId: string
  readonly review: BrowserSafeSemanticReview
  readonly result?: ProductReviewResult
  readonly failure?: string
}

export type PreparedClarificationEntry = {
  readonly kind: 'clarification'
  readonly operationId: string
  readonly interactionId: string
  readonly questions: readonly TargetProductQuestion[]
  readonly resolution?: 'answered' | 'cancelled'
}

export type PreparedTranscriptEntry =
  | {
      readonly kind: 'user' | 'agent' | 'plan'
      readonly id: string
      readonly text: string
    }
  | PreparedSemanticReviewEntry
  | PreparedClarificationEntry
  | {
      readonly kind: 'notice'
      readonly id: string
      readonly text: string
    }

type PreparedChatState = {
  readonly phase:
    | 'idle'
    | 'running'
    | 'awaiting-review'
    | 'awaiting-clarification'
    | 'stopping'
    | 'completed'
    | 'failed'
    | 'interrupted'
    | 'unknown'
  readonly transcript: readonly PreparedTranscriptEntry[]
  readonly operationId?: string
  readonly accepted: boolean
  readonly terminal: boolean
  readonly semanticReview?: PreparedSemanticReviewEntry
  readonly clarification?: PreparedClarificationEntry
  readonly failure?: string
}

const initialState: PreparedChatState = {
  phase: 'idle',
  transcript: [],
  accepted: false,
  terminal: true,
}

export function usePreparedProductChat(options: {
  readonly accountReadiness: ProductAccountReadiness
  readonly lifecycle: TargetProductBootstrap['workspaceLifecycle'] | undefined
  readonly activeOperation: TargetProductBootstrap['activeOperation']
  readonly onSettled: () => Promise<void>
}) {
  const [state, setState] = useState(initialState)
  const stateRef = useRef(state)
  const [draft, setDraft] = useState('')
  const [settingsReady, setSettingsReady] = useState(false)
  const [responsePending, setResponsePending] = useState(false)
  const operation = useRef<AbortController | undefined>(undefined)

  const transition = useCallback(
    (update: (current: PreparedChatState) => PreparedChatState) => {
      const next = update(stateRef.current)
      stateRef.current = next
      setState(next)
      return next
    },
    [],
  )

  useEffect(() => {
    if (
      options.lifecycle?.state !== 'active' ||
      options.accountReadiness.state !== 'ready'
    ) {
      setSettingsReady(false)
      return
    }
    const controller = new AbortController()
    void fetchPreparedCodexSettings(controller.signal).then(
      () => setSettingsReady(true),
      () => setSettingsReady(false),
    )
    return () => controller.abort()
  }, [options.accountReadiness.state, options.lifecycle?.state])

  useEffect(
    () => () => {
      operation.current?.abort()
    },
    [],
  )

  const locallyActive = !state.terminal
  const available =
    options.lifecycle?.state === 'active' &&
    options.accountReadiness.state === 'ready' &&
    settingsReady
  const canCompose =
    available &&
    !locallyActive &&
    options.activeOperation === null &&
    !responsePending

  async function submitMessage(): Promise<void> {
    const text = draft.trim()
    if (!canCompose || !text) return
    const controller = new AbortController()
    operation.current = controller
    setDraft('')
    transition((current) => ({
      ...current,
      phase: 'running',
      transcript: [
        ...current.transcript,
        { kind: 'user', id: crypto.randomUUID(), text },
      ],
      operationId: undefined,
      accepted: false,
      terminal: false,
      semanticReview: undefined,
      clarification: undefined,
      failure: undefined,
    }))
    try {
      await streamPreparedChat(
        { text },
        (frame) => transition((current) => reduceFrame(current, frame)),
        controller.signal,
      )
      if (!stateRef.current.terminal) throw invalidStream()
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return
      const message =
        error instanceof PreparedProductApiError
          ? error.displayMessage
          : 'AY 작업 흐름을 계속하지 못했습니다.'
      transition((current) => ({
        ...current,
        phase: 'unknown',
        terminal: true,
        semanticReview: undefined,
        clarification: undefined,
        failure: message,
      }))
    } finally {
      if (operation.current === controller) operation.current = undefined
      await options.onSettled().catch(() => undefined)
    }
  }

  async function settleReview(
    review: PreparedSemanticReviewEntry,
    result: ProductReviewResult,
  ): Promise<void> {
    if (
      responsePending ||
      stateRef.current.semanticReview?.interactionId !== review.interactionId
    ) {
      return
    }
    setResponsePending(true)
    try {
      await submitPreparedReview(review.interactionId, result)
    } catch (error) {
      transition((current) => ({
        ...current,
        failure:
          error instanceof PreparedProductApiError
            ? error.displayMessage
            : '검토 결과를 전달하지 못했습니다.',
      }))
    } finally {
      setResponsePending(false)
    }
  }

  async function answerClarification(
    interaction: PreparedClarificationEntry,
    answers: Readonly<Record<string, readonly string[]>>,
  ): Promise<void> {
    if (
      responsePending ||
      stateRef.current.clarification?.interactionId !== interaction.interactionId
    ) {
      return
    }
    setResponsePending(true)
    try {
      await answerPreparedInteraction(
        interaction.operationId,
        interaction.interactionId,
        { answers },
      )
    } catch (error) {
      recordResponseFailure(error)
    } finally {
      setResponsePending(false)
    }
  }

  async function cancelClarification(
    interaction: PreparedClarificationEntry,
  ): Promise<void> {
    if (
      responsePending ||
      stateRef.current.clarification?.interactionId !== interaction.interactionId
    ) {
      return
    }
    setResponsePending(true)
    try {
      await cancelPreparedInteraction(
        interaction.operationId,
        interaction.interactionId,
      )
    } catch (error) {
      recordResponseFailure(error)
    } finally {
      setResponsePending(false)
    }
  }

  async function interrupt(): Promise<void> {
    const operationId = stateRef.current.operationId
    if (!operationId || !locallyActive || responsePending) return
    setResponsePending(true)
    transition((current) => ({ ...current, phase: 'stopping' }))
    try {
      await interruptPreparedOperation(operationId)
    } catch (error) {
      recordResponseFailure(error)
    } finally {
      setResponsePending(false)
    }
  }

  function recordResponseFailure(error: unknown): void {
    transition((current) => ({
      ...current,
      failure:
        error instanceof PreparedProductApiError
          ? error.displayMessage
          : 'AY에게 응답을 전달하지 못했습니다.',
    }))
  }

  return {
    state,
    draft,
    setDraft,
    canCompose,
    canSubmit: canCompose && draft.trim().length > 0,
    canInterrupt:
      locallyActive &&
      state.accepted &&
      state.phase !== 'stopping' &&
      !responsePending,
    responsePending,
    submitMessage,
    settleReview,
    answerClarification,
    cancelClarification,
    interrupt,
  }
}

function reduceFrame(
  state: PreparedChatState,
  frame: PreparedProductFrame,
): PreparedChatState {
  if (state.terminal) throw invalidStream()
  if (
    state.operationId !== undefined &&
    frame.operationId !== state.operationId
  ) {
    throw invalidStream()
  }
  if (frame.type === 'review.requested') {
    if (!state.accepted || state.semanticReview || state.clarification) {
      throw invalidStream()
    }
    const review: PreparedSemanticReviewEntry = {
      kind: 'semantic-review',
      operationId: frame.operationId,
      interactionId: frame.interactionId,
      review: structuredClone(frame.review),
    }
    return {
      ...state,
      phase: 'awaiting-review',
      transcript: [...state.transcript, review],
      semanticReview: review,
    }
  }
  if (frame.type === 'review.resolved' || frame.type === 'review.failed') {
    const review = state.semanticReview
    if (
      !review ||
      review.operationId !== frame.operationId ||
      review.interactionId !== frame.interactionId
    ) {
      throw invalidStream()
    }
    const settled: PreparedSemanticReviewEntry = {
      ...review,
      ...(frame.type === 'review.resolved'
        ? { result: structuredClone(frame.result) }
        : { failure: frame.reason }),
    }
    return {
      ...state,
      phase: 'running',
      transcript: state.transcript.map((entry) =>
        entry === review ? settled : entry,
      ),
      semanticReview: undefined,
    }
  }

  switch (frame.type) {
    case 'operation.preparing':
      if (state.operationId || state.accepted) throw invalidStream()
      return { ...state, operationId: frame.operationId }
    case 'operation.accepted':
      if (state.operationId !== frame.operationId || state.accepted) {
        throw invalidStream()
      }
      return { ...state, accepted: true }
    case 'agent_message.delta':
    case 'plan.delta':
      return appendText(state, frame.activityId, frame.delta, frame.type)
    case 'agent_message.completed':
    case 'plan.completed':
      return appendCompletedText(
        state,
        frame.activityId,
        frame.text,
        frame.type,
      )
    case 'interaction.requested': {
      if (!state.accepted || state.semanticReview || state.clarification) {
        throw invalidStream()
      }
      const clarification: PreparedClarificationEntry = {
        kind: 'clarification',
        operationId: frame.operationId,
        interactionId: frame.interactionId,
        questions: structuredClone(frame.questions),
      }
      return {
        ...state,
        phase: 'awaiting-clarification',
        transcript: [...state.transcript, clarification],
        clarification,
      }
    }
    case 'interaction.resolved': {
      const clarification = state.clarification
      if (
        !clarification ||
        clarification.interactionId !== frame.interactionId
      ) {
        throw invalidStream()
      }
      const settled = {
        ...clarification,
        resolution: frame.resolution,
      } satisfies PreparedClarificationEntry
      return {
        ...state,
        phase: 'running',
        transcript: state.transcript.map((entry) =>
          entry === clarification ? settled : entry,
        ),
        clarification: undefined,
      }
    }
    case 'interrupt.acknowledged':
      return { ...state, phase: 'stopping' }
    case 'operation.error':
      return {
        ...state,
        transcript: [
          ...state.transcript,
          {
            kind: 'notice',
            id: crypto.randomUUID(),
            text: frame.displayMessage,
          },
        ],
      }
    case 'operation.terminal':
      return {
        ...state,
        phase:
          frame.status === 'not_accepted' || frame.status === 'unknown'
            ? 'unknown'
            : frame.status,
        terminal: true,
        semanticReview: undefined,
        clarification: undefined,
      }
  }
}

function appendText(
  state: PreparedChatState,
  id: string,
  text: string,
  type: 'agent_message.delta' | 'plan.delta',
): PreparedChatState {
  const kind = type === 'plan.delta' ? 'plan' : 'agent'
  const index = state.transcript.findIndex(
    (entry) => entry.kind === kind && entry.id === id,
  )
  if (index < 0) {
    return {
      ...state,
      transcript: [...state.transcript, { kind, id, text }],
    }
  }
  return {
    ...state,
    transcript: state.transcript.map((entry, candidate) =>
      candidate === index && (entry.kind === 'agent' || entry.kind === 'plan')
        ? { ...entry, text: `${entry.text}${text}` }
        : entry,
    ),
  }
}

function appendCompletedText(
  state: PreparedChatState,
  id: string,
  text: string,
  type: 'agent_message.completed' | 'plan.completed',
): PreparedChatState {
  const kind = type === 'plan.completed' ? 'plan' : 'agent'
  const index = state.transcript.findIndex(
    (entry) => entry.kind === kind && entry.id === id,
  )
  if (index < 0) {
    return {
      ...state,
      transcript: [...state.transcript, { kind, id, text }],
    }
  }
  return {
    ...state,
    transcript: state.transcript.map((entry, candidate) =>
      candidate === index && (entry.kind === 'agent' || entry.kind === 'plan')
        ? { ...entry, text }
        : entry,
    ),
  }
}

function invalidStream(): Error {
  return new Error('Invalid prepared product stream')
}
