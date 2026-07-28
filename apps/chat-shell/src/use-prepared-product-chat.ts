import { useCallback, useEffect, useRef, useState } from 'react'

import {
  PRODUCT_ACTION_FILE_REF_MAX_ENTRIES,
  type BrowserSafeSemanticReview,
  type ProductAccountReadiness,
  type ProductCodexModel,
  type ProductCodexTurnSettings,
  type ProductReviewResult,
  type TargetProductQuestion,
  type TargetProductBootstrap,
} from '@ay-ple/product-contract'

import {
  PreparedProductApiError,
  answerPreparedInteraction,
  cancelPreparedInteraction,
  fetchPreparedCodexSettings,
  interruptPreparedOperation,
  streamPreparedAction,
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
  readonly failure?:
    | 'runtime_terminated'
    | 'transport_failed'
    | 'turn_interrupted'
}

export type PreparedActionEntry = {
  readonly kind: 'action'
  readonly id: string
  readonly label: string
  readonly relativePaths: readonly string[]
}

export type PreparedTranscriptEntry =
  | {
      readonly kind: 'user' | 'agent' | 'plan'
      readonly id: string
      readonly text: string
    }
  | PreparedActionEntry
  | PreparedSemanticReviewEntry
  | PreparedClarificationEntry
  | {
      readonly kind: 'notice'
      readonly id: string
      readonly text: string
    }

export type PreparedChatState = {
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

export type CodexSettingsState = 'idle' | 'loading' | 'loaded' | 'failed'

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
  const [codexModels, setCodexModels] = useState<
    readonly ProductCodexModel[]
  >([])
  const [codexSettingsState, setCodexSettingsState] =
    useState<CodexSettingsState>('idle')
  const [selectedModelId, setSelectedModelId] = useState<string>()
  const [selectedReasoningEffort, setSelectedReasoningEffort] =
    useState<string>()
  const [fastMode, setFastMode] = useState(false)
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
      setCodexModels([])
      setSelectedModelId(undefined)
      setSelectedReasoningEffort(undefined)
      setFastMode(false)
      setCodexSettingsState('idle')
      return
    }
    const controller = new AbortController()
    setCodexSettingsState('loading')
    void fetchPreparedCodexSettings(controller.signal).then(
      ({ models }) => {
        if (controller.signal.aborted) return
        const defaultModel =
          models.find(({ isDefault }) => isDefault) ?? models[0]
        setCodexModels(models)
        setSelectedModelId(defaultModel?.model)
        setSelectedReasoningEffort(defaultModel?.defaultReasoningEffort)
        setFastMode(defaultModel?.fastModeDefault ?? false)
        setCodexSettingsState('loaded')
      },
      (error: unknown) => {
        if (
          controller.signal.aborted ||
          (error instanceof DOMException && error.name === 'AbortError')
        ) {
          return
        }
        setCodexModels([])
        setSelectedModelId(undefined)
        setSelectedReasoningEffort(undefined)
        setFastMode(false)
        setCodexSettingsState('failed')
      },
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
  const selectedModel = codexModels.find(
    ({ model }) => model === selectedModelId,
  )
  const codexTurnSettings = createCodexTurnSettings(
    selectedModel,
    selectedReasoningEffort,
    fastMode,
  )
  const available =
    options.lifecycle?.state === 'active' &&
    options.accountReadiness.state === 'ready' &&
    isCodexSettingsSettled(codexSettingsState)
  const canStartOperation =
    available &&
    !locallyActive &&
    options.activeOperation === null &&
    !responsePending
  const canCompose = canStartOperation
  const canConfigureCodex =
    codexSettingsState === 'loaded' &&
    !locallyActive &&
    options.activeOperation === null &&
    !responsePending

  async function submitMessage(): Promise<void> {
    const text = draft.trim()
    if (!canCompose || !text) return
    const settings = copyCodexTurnSettings(codexTurnSettings)
    setDraft('')
    await startOperation(
      { kind: 'user', id: crypto.randomUUID(), text },
      (onFrame, signal) =>
        streamPreparedChat(
          {
            text,
            ...(settings === undefined
              ? {}
              : { codexSettings: settings }),
          },
          onFrame,
          signal,
        ),
    )
  }

  async function invokeOrganizeSources(
    relativePaths: readonly string[],
  ): Promise<void> {
    if (
      !canStartOperation ||
      relativePaths.length === 0 ||
      relativePaths.length > PRODUCT_ACTION_FILE_REF_MAX_ENTRIES
    ) {
      return
    }
    const frozenPaths = relativePaths.map((relativePath) => relativePath)
    const frozenFiles = frozenPaths.map((relativePath) => ({
      relativePath,
    }))
    const settings = copyCodexTurnSettings(codexTurnSettings)
    await startOperation(
      {
        kind: 'action',
        id: crypto.randomUUID(),
        label: '선택한 자료 정리하기',
        relativePaths: frozenPaths,
      },
      (onFrame, signal) =>
        streamPreparedAction(
          {
            files: frozenFiles,
            ...(settings === undefined
              ? {}
              : { codexSettings: settings }),
          },
          onFrame,
          signal,
        ),
    )
  }

  async function startOperation(
    entry: PreparedTranscriptEntry,
    stream: (
      onFrame: (frame: PreparedProductFrame) => void,
      signal: AbortSignal,
    ) => Promise<void>,
  ): Promise<void> {
    if (!stateRef.current.terminal || operation.current) return
    const controller = new AbortController()
    operation.current = controller
    transition((current) => ({
      ...current,
      phase: 'running',
      transcript: [...current.transcript, entry],
      operationId: undefined,
      accepted: false,
      terminal: false,
      semanticReview: undefined,
      clarification: undefined,
      failure: undefined,
    }))
    try {
      await stream(
        (frame) =>
          transition((current) => reducePreparedProductFrame(current, frame)),
        controller.signal,
      )
      if (!stateRef.current.terminal) throw invalidStream()
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return
      const message =
        error instanceof PreparedProductApiError
          ? error.displayMessage
          : 'AY 작업 흐름을 계속하지 못했습니다.'
      const outcome =
        error instanceof PreparedProductApiError &&
        error.provenance === 'server_rejection' &&
        !stateRef.current.accepted &&
        stateRef.current.operationId === undefined
          ? 'not_accepted'
          : 'unknown'
      transition((current) =>
        reducePreparedProductFailure(current, message, outcome),
      )
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

  function selectCodexModel(modelId: string): void {
    if (!canConfigureCodex) return
    const model = codexModels.find((candidate) => candidate.model === modelId)
    if (!model) return
    setSelectedModelId(model.model)
    setSelectedReasoningEffort(model.defaultReasoningEffort)
    setFastMode(model.fastModeDefault)
  }

  function selectReasoningEffort(reasoningEffort: string): void {
    if (
      !canConfigureCodex ||
      !selectedModel?.supportedReasoningEfforts.some(
        (option) => option.reasoningEffort === reasoningEffort,
      )
    ) {
      return
    }
    setSelectedReasoningEffort(reasoningEffort)
  }

  function toggleFastMode(enabled: boolean): void {
    if (!canConfigureCodex || !selectedModel?.fastModeAvailable) return
    setFastMode(enabled)
  }

  return {
    state,
    draft,
    setDraft,
    canStartOperation,
    canCompose,
    canSubmit: canCompose && draft.trim().length > 0,
    canConfigureCodex,
    canInterrupt:
      locallyActive &&
      state.accepted &&
      state.phase !== 'stopping' &&
      !responsePending,
    operationActive:
      locallyActive ||
      options.activeOperation !== null ||
      responsePending,
    responsePending,
    codexModels,
    codexSettingsState,
    selectedModel,
    selectedReasoningEffort,
    fastMode,
    selectCodexModel,
    selectReasoningEffort,
    toggleFastMode,
    submitMessage,
    invokeOrganizeSources,
    settleReview,
    answerClarification,
    cancelClarification,
    interrupt,
  }
}

export function isCodexSettingsSettled(state: CodexSettingsState): boolean {
  return state === 'loaded' || state === 'failed'
}

export function createCodexTurnSettings(
  model: ProductCodexModel | undefined,
  reasoningEffort: string | undefined,
  fastMode: boolean,
): ProductCodexTurnSettings | undefined {
  if (
    !model ||
    !reasoningEffort ||
    !model.supportedReasoningEfforts.some(
      (option) => option.reasoningEffort === reasoningEffort,
    )
  ) {
    return undefined
  }
  return {
    model: model.model,
    reasoningEffort,
    serviceTier:
      fastMode && model.fastModeAvailable ? 'fast' : 'default',
  }
}

function copyCodexTurnSettings(
  settings: ProductCodexTurnSettings | undefined,
): ProductCodexTurnSettings | undefined {
  return settings === undefined
    ? undefined
    : {
        model: settings.model,
        reasoningEffort: settings.reasoningEffort,
        serviceTier: settings.serviceTier,
      }
}

export function reducePreparedProductFrame(
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
      return reducePreparedProductTerminal(state, frame.status)
  }
}

export function reducePreparedProductFailure(
  state: PreparedChatState,
  message: string,
  outcome: 'not_accepted' | 'unknown' = 'unknown',
): PreparedChatState {
  const settled = settleUnresolvedInteractions(
    state,
    'transport_failed',
  )
  return {
    ...settled,
    phase: outcome === 'not_accepted' ? 'failed' : 'unknown',
    terminal: true,
    semanticReview: undefined,
    clarification: undefined,
    failure: message,
  }
}

function reducePreparedProductTerminal(
  state: PreparedChatState,
  status:
    | 'not_accepted'
    | 'completed'
    | 'failed'
    | 'interrupted'
    | 'unknown',
): PreparedChatState {
  const settled = settleUnresolvedInteractions(
    state,
    status === 'interrupted' ? 'turn_interrupted' : 'runtime_terminated',
  )
  return {
    ...settled,
    phase:
      status === 'not_accepted'
        ? 'failed'
        : status,
    terminal: true,
    semanticReview: undefined,
    clarification: undefined,
  }
}

function settleUnresolvedInteractions(
  state: PreparedChatState,
  failure: 'runtime_terminated' | 'transport_failed' | 'turn_interrupted',
): PreparedChatState {
  return {
    ...state,
    transcript: state.transcript.map((entry) => {
      if (
        entry.kind === 'semantic-review' &&
        entry.result === undefined &&
        entry.failure === undefined
      ) {
        return { ...entry, failure }
      }
      if (
        entry.kind === 'clarification' &&
        entry.resolution === undefined &&
        entry.failure === undefined
      ) {
        return { ...entry, failure }
      }
      return entry
    }),
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
