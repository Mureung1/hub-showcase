import type {
  ProductInteractionAnswerRequest,
  ProductMaterialSelection,
  ProductOperationFrame,
  ProductQuestion,
  ProductStatePatch,
} from './product-api.js'

export type ProductChatPhase =
  | 'idle'
  | 'submitting'
  | 'preparing'
  | 'running'
  | 'awaiting-clarification'
  | 'awaiting-review'
  | 'stopping'
  | 'completed'
  | 'interrupted'
  | 'continuation-lost'
  | 'failed'
  | 'unknown'
  | 'request-failed'
  | 'stream-failed'

export type ProductChatFailure = {
  readonly code: string
  readonly displayMessage: string
}

export type ProductClarificationBinding = {
  readonly operationId: string
  readonly interactionId: string
  readonly questions: readonly ProductQuestion[]
}

export type ProductReviewBinding = {
  readonly operationId: string
  readonly interactionId: string
  readonly patchId: string
  readonly decisionKey: string
  readonly patch: ProductStatePatch
  readonly questions: readonly ProductQuestion[]
}

export type ProductInterrupt = {
  readonly operationId: string
  readonly state: 'requesting' | 'acknowledged'
}

export type ProductRecoveryBinding = Extract<
  ProductOperationFrame,
  { readonly type: 'operation.recovery' }
>

type ProductRecoveryTranscriptEntry<
  Recovery extends ProductRecoveryBinding = ProductRecoveryBinding,
> = Recovery extends ProductRecoveryBinding
  ? { readonly kind: 'recovery' } & Omit<Recovery, 'type'>
  : never

type ProductOperationKind = 'assignment' | 'chat'

export type ProductActiveOperation = {
  readonly kind: ProductOperationKind
  readonly materials: readonly ProductMaterialSelection[]
  readonly stage:
    | 'submitting'
    | 'preparing'
    | 'running'
    | 'awaiting-clarification'
    | 'awaiting-review'
    | 'stopping'
  readonly operationId?: string
  readonly runId?: string
  readonly accepted: boolean
  readonly interaction?: ProductClarificationBinding
  readonly review?: ProductReviewBinding
  readonly interrupt?: ProductInterrupt
}

type ProductTextTranscriptEntry = {
  readonly kind: 'plan' | 'agent'
  readonly activityId: string
  readonly text: string
  readonly status: 'streaming' | 'completed' | 'stopped'
}

export type ProductTranscriptEntry =
  | {
      readonly kind: 'operation'
      readonly operationKind: ProductOperationKind
      readonly status: 'submitting' | 'preparing' | 'accepted'
      readonly milestones: readonly ('submitting' | 'preparing' | 'accepted')[]
    }
  | { readonly kind: 'user'; readonly text: string }
  | {
      readonly kind: 'skill'
      readonly name: string
      readonly version: string
    }
  | ProductTextTranscriptEntry
  | {
      readonly kind: 'mcp'
      readonly activityId: string
      readonly status: 'running' | 'completed' | 'failed'
      readonly patch?: ProductStatePatch
      readonly displayMessage?: string
    }
  | ({ readonly kind: 'clarification' } &
      ProductClarificationBinding & {
        readonly resolution?: 'answered' | 'cancelled'
      })
  | ({ readonly kind: 'review' } &
      ProductReviewBinding & {
        readonly outcome?: 'accepted' | 'revised' | 'rejected' | 'cancelled'
      })
  | {
      readonly kind: 'notice'
      readonly code: string
      readonly displayMessage: string
      readonly willRetry?: boolean
    }
  | ProductRecoveryTranscriptEntry
  | {
      readonly kind: 'terminal'
      readonly operationKind: ProductOperationKind
      readonly status:
        | 'not_accepted'
        | 'acceptance_unknown'
        | 'completed'
        | 'failed'
        | 'interrupted'
        | 'unknown'
      readonly validationOutcome?: 'passed' | 'failed' | 'unknown'
      readonly failureCode?: string
    }

export type ProductChatState = {
  readonly phase: ProductChatPhase
  readonly transcript: readonly ProductTranscriptEntry[]
  readonly activeOperation?: ProductActiveOperation
  readonly failure?: ProductChatFailure
  readonly controlFailure?: ProductChatFailure
  readonly recovery?: ProductRecoveryBinding
  readonly lastAssignment?: {
    readonly operationId: string
    readonly runId: string
  }
}

export type ProductChatAction =
  | {
      readonly type: 'operation.started'
      readonly kind: ProductOperationKind
      readonly materials: readonly ProductMaterialSelection[]
      readonly text?: string
    }
  | { readonly type: 'operation.frame'; readonly frame: ProductOperationFrame }
  | { readonly type: 'operation.stream-ended' }
  | { readonly type: 'operation.stream-failed' }
  | {
      readonly type: 'operation.request-failed'
      readonly failure: ProductChatFailure
    }
  | {
      readonly type: 'operation.interrupt-requested'
      readonly operationId: string
    }
  | {
      readonly type: 'operation.interrupt-failed'
      readonly operationId: string
      readonly failure: ProductChatFailure
    }
  | {
      readonly type: 'operation.control-failed'
      readonly failure: ProductChatFailure
    }
  | {
      readonly type: 'operation.review-reconciled'
      readonly review: ProductReviewBinding
      readonly outcome: 'accepted' | 'rejected'
    }
  | { readonly type: 'operation.control-cleared' }

const invalidStreamFailure = {
  code: 'invalid_product_stream',
  displayMessage: 'AY 작업 흐름을 확인하지 못했습니다.',
} as const

export function createInitialProductChatState(): ProductChatState {
  return { phase: 'idle', transcript: [] }
}

export function reduceProductChatState(
  state: ProductChatState,
  action: ProductChatAction,
): ProductChatState {
  if (action.type === 'operation.started') {
    if (state.activeOperation) return state
    const transcript: ProductTranscriptEntry[] = [...state.transcript]
    if (action.kind === 'chat' && action.text?.trim()) {
      transcript.push({ kind: 'user', text: action.text })
    }
    transcript.push({
      kind: 'operation',
      operationKind: action.kind,
      status: 'submitting',
      milestones: ['submitting'],
    })
    return {
      phase: 'submitting',
      transcript,
      recovery: undefined,
      activeOperation: {
        kind: action.kind,
        materials: action.materials.map((material) => ({ ...material })),
        stage: 'submitting',
        accepted: false,
      },
    }
  }
  if (action.type === 'operation.request-failed') {
    if (state.activeOperation?.stage !== 'submitting') {
      return invalidStream(state)
    }
    return {
      ...state,
      phase: 'request-failed',
      activeOperation: undefined,
      failure: { ...action.failure },
    }
  }
  if (action.type === 'operation.stream-failed') return invalidStream(state)
  if (action.type === 'operation.stream-ended') {
    return state.activeOperation || !isTerminalPhase(state.phase)
      ? invalidStream(state)
      : state
  }
  if (action.type === 'operation.interrupt-requested') {
    if (
      !state.activeOperation?.accepted ||
      state.activeOperation.operationId !== action.operationId ||
      state.activeOperation.interrupt !== undefined
    ) {
      return state
    }
    return {
      ...state,
      phase: 'stopping',
      activeOperation: {
        ...state.activeOperation,
        stage: 'stopping',
        interrupt: {
          operationId: action.operationId,
          state: 'requesting',
        },
      },
      controlFailure: undefined,
    }
  }
  if (action.type === 'operation.interrupt-failed') {
    const active = state.activeOperation
    if (
      active?.operationId !== action.operationId ||
      active.interrupt?.operationId !== action.operationId ||
      active.interrupt.state !== 'requesting'
    ) {
      return state
    }
    return {
      ...state,
      phase: phaseForActiveOperation(active),
      activeOperation: {
        ...active,
        stage:
          active.review !== undefined
            ? 'awaiting-review'
            : active.interaction !== undefined
              ? 'awaiting-clarification'
              : 'running',
        interrupt: undefined,
      },
      controlFailure: { ...action.failure },
    }
  }
  if (action.type === 'operation.control-failed') {
    return { ...state, controlFailure: { ...action.failure } }
  }
  if (action.type === 'operation.review-reconciled') {
    return reconcileProductReview(state, action.review, action.outcome)
  }
  if (action.type === 'operation.control-cleared') {
    return { ...state, controlFailure: undefined }
  }
  return reduceProductFrame(state, action.frame)
}

export function isProductOperationActive(state: ProductChatState): boolean {
  return state.activeOperation !== undefined
}

export function canRespondToProductClarification(
  state: ProductChatState,
  expected: ProductClarificationBinding,
): boolean {
  const current = state.activeOperation?.interaction
  return (
    state.phase === 'awaiting-clarification' &&
    state.activeOperation?.stage === 'awaiting-clarification' &&
    current?.operationId === expected.operationId &&
    current.interactionId === expected.interactionId
  )
}

export function canRespondToProductReview(
  state: ProductChatState,
  expected: ProductReviewBinding,
): boolean {
  const current = state.activeOperation?.review
  return (
    state.phase === 'awaiting-review' &&
    state.activeOperation?.stage === 'awaiting-review' &&
    current?.operationId === expected.operationId &&
    current.interactionId === expected.interactionId &&
    current.patchId === expected.patchId &&
    current.decisionKey === expected.decisionKey
  )
}

export function productInteractionAnswers(
  questionId: string,
  answer: string,
): ProductInteractionAnswerRequest {
  return { answers: { [questionId]: [answer] } }
}

function reduceProductFrame(
  state: ProductChatState,
  frame: ProductOperationFrame,
): ProductChatState {
  const active = state.activeOperation

  if (frame.type === 'operation.recovery') {
    return reduceProductRecovery(state, frame)
  }

  if (!active) return invalidStream(state)

  if (frame.type === 'operation.preparing') {
    if (
      active.stage !== 'submitting' ||
      !matchesOperationKind(active.kind, frame.operationId)
    ) {
      return invalidStream(state)
    }
    const runId = 'runId' in frame ? frame.runId : undefined
    if (
      (active.kind === 'assignment' && runId === undefined) ||
      (active.kind === 'chat' && runId !== undefined)
    ) {
      return invalidStream(state)
    }
    return {
      ...state,
      phase: 'preparing',
      transcript: updateLastOperation(state.transcript, 'preparing'),
      activeOperation: {
        ...active,
        stage: 'preparing',
        operationId: frame.operationId,
        ...(runId === undefined ? {} : { runId }),
      },
      ...(active.kind === 'assignment' && runId !== undefined
        ? {
            lastAssignment: {
              operationId: frame.operationId,
              runId,
            },
          }
        : {}),
    }
  }

  if (!matchesOperation(active, frame.operationId)) {
    return invalidStream(state)
  }

  if (frame.type === 'operation.accepted') {
    if (
      active.stage !== 'preparing' ||
      !matchesRun(active, frame) ||
      active.accepted
    ) {
      return invalidStream(state)
    }
    return {
      ...state,
      phase: 'running',
      transcript: updateLastOperation(state.transcript, 'accepted'),
      activeOperation: { ...active, stage: 'running', accepted: true },
    }
  }

  if (frame.type === 'operation.terminal') {
    if (
      !matchesRun(active, frame) ||
      !isAllowedTerminalSettlement(active, frame.status)
    ) {
      return invalidStream(state)
    }
    const terminal: ProductTranscriptEntry = {
      kind: 'terminal',
      operationKind: active.kind,
      status: frame.status,
      ...('validationOutcome' in frame
        ? { validationOutcome: frame.validationOutcome }
        : {}),
      ...(frame.failureCode === undefined
        ? {}
        : { failureCode: frame.failureCode }),
    }
    return {
      ...state,
      phase: recoveryTerminalPhase(state.recovery, frame),
      transcript: [
        ...stopStreamingEntries(state.transcript),
        terminal,
      ],
      activeOperation: undefined,
    }
  }

  if (!active.accepted) return invalidStream(state)

  if (frame.type === 'skill.requested') {
    if (active.kind !== 'assignment') return invalidStream(state)
    return {
      ...state,
      transcript: [
        ...state.transcript,
        {
          kind: 'skill',
          name: frame.skill.name,
          version: frame.skill.version,
        },
      ],
    }
  }

  if (
    frame.type === 'plan.delta' ||
    frame.type === 'plan.completed' ||
    frame.type === 'agent_message.delta' ||
    frame.type === 'agent_message.completed'
  ) {
    return reduceTextActivity(state, frame)
  }

  if (frame.type === 'mcp_call.started') {
    if (findAnyActivity(state.transcript, frame.activityId)) {
      return invalidStream(state)
    }
    return {
      ...state,
      transcript: [
        ...state.transcript,
        { kind: 'mcp', activityId: frame.activityId, status: 'running' },
      ],
    }
  }

  if (frame.type === 'mcp_call.completed') {
    const existing = findActivity(state.transcript, 'mcp', frame.activityId)
    if (existing?.kind !== 'mcp' || existing.status !== 'running') {
      return invalidStream(state)
    }
    return {
      ...state,
      transcript: state.transcript.map((entry) =>
        entry.kind === 'mcp' && entry.activityId === frame.activityId
          ? {
              ...entry,
              status: 'completed' as const,
              patch: clonePatch(frame.patch),
            }
          : entry,
      ),
    }
  }

  if (frame.type === 'mcp_call.failed') {
    const existing = findActivity(state.transcript, 'mcp', frame.activityId)
    if (existing?.kind !== 'mcp' || existing.status !== 'running') {
      return invalidStream(state)
    }
    return {
      ...state,
      transcript: state.transcript.map((entry) =>
        entry.kind === 'mcp' && entry.activityId === frame.activityId
          ? {
              ...entry,
              status: 'failed' as const,
              displayMessage: frame.displayMessage,
            }
          : entry,
      ),
    }
  }

  if (frame.type === 'interaction.requested') {
    if (active.interaction || active.review) return invalidStream(state)
    const nextStage = stagePreservingStop(
      active,
      'awaiting-clarification',
    )
    const interaction: ProductClarificationBinding = {
      operationId: frame.operationId,
      interactionId: frame.interactionId,
      questions: frame.questions.map(cloneQuestion),
    }
    return {
      ...state,
      phase: nextStage,
      transcript: [
        ...state.transcript,
        { kind: 'clarification', ...interaction },
      ],
      activeOperation: {
        ...active,
        stage: nextStage,
        interaction,
      },
    }
  }

  if (frame.type === 'review.requested') {
    if (
      active.interaction ||
      active.review ||
      state.transcript.some(
        (entry) =>
          entry.kind === 'review' &&
          entry.operationId === frame.operationId,
      ) ||
      !validReviewPatch(frame.patch, active.materials) ||
      !hasMatchingCompletedMcp(state.transcript, frame.patchId)
    ) {
      return invalidStream(state)
    }
    const review: ProductReviewBinding = {
      operationId: frame.operationId,
      interactionId: frame.interactionId,
      patchId: frame.patchId,
      decisionKey: frame.decisionKey,
      patch: clonePatch(frame.patch),
      questions: frame.questions.map(cloneQuestion),
    }
    const nextStage = stagePreservingStop(active, 'awaiting-review')
    return {
      ...state,
      phase: nextStage,
      transcript: [...state.transcript, { kind: 'review', ...review }],
      activeOperation: { ...active, stage: nextStage, review },
    }
  }

  if (frame.type === 'review.replaced') {
    const replacedReviewIndex = state.transcript.findLastIndex(
      (entry) => entry.kind === 'review',
    )
    const replacedReview = state.transcript[replacedReviewIndex]
    if (
      active.interaction ||
      active.review ||
      replacedReview?.kind !== 'review' ||
      replacedReview.outcome !== 'revised' ||
      replacedReview.operationId !== frame.operationId ||
      replacedReview.interactionId !== frame.replaces.interactionId ||
      replacedReview.patchId !== frame.replaces.patchId ||
      replacedReview.decisionKey !== frame.replaces.decisionKey ||
      frame.interactionId === frame.replaces.interactionId ||
      frame.patchId === frame.replaces.patchId ||
      frame.decisionKey === frame.replaces.decisionKey ||
      !validReviewPatch(frame.patch, active.materials) ||
      !hasMatchingCompletedMcp(state.transcript, frame.patchId)
    ) {
      return invalidStream(state)
    }
    const review: ProductReviewBinding = {
      operationId: frame.operationId,
      interactionId: frame.interactionId,
      patchId: frame.patchId,
      decisionKey: frame.decisionKey,
      patch: clonePatch(frame.patch),
      questions: frame.questions.map(cloneQuestion),
    }
    const nextStage = stagePreservingStop(active, 'awaiting-review')
    return {
      ...state,
      phase: nextStage,
      transcript: [
        ...state.transcript.map((entry, index) =>
          index === replacedReviewIndex && entry.kind === 'review'
            ? {
                ...entry,
                patch: { ...entry.patch, status: 'superseded' as const },
              }
            : entry,
        ),
        { kind: 'review', ...review },
      ],
      activeOperation: { ...active, stage: nextStage, review },
    }
  }

  if (frame.type === 'interaction.resolved') {
    const interaction = active.interaction
    if (
      !interaction ||
      interaction.interactionId !== frame.interactionId
    ) {
      return invalidStream(state)
    }
    const nextStage = stagePreservingStop(active, 'running')
    return {
      ...state,
      phase: nextStage,
      transcript: state.transcript.map((entry) =>
        entry.kind === 'clarification' &&
        entry.operationId === frame.operationId &&
        entry.interactionId === frame.interactionId
          ? { ...entry, resolution: frame.resolution }
          : entry,
      ),
      activeOperation: {
        ...active,
        stage: nextStage,
        interaction: undefined,
      },
    }
  }

  if (frame.type === 'review.resolved') {
    const review = active.review
    const alreadySettled = state.transcript.some(
      (entry) =>
        entry.kind === 'review' &&
        entry.operationId === frame.operationId &&
        entry.interactionId === frame.interactionId &&
        entry.patchId === frame.patchId &&
        entry.decisionKey === frame.decisionKey &&
        entry.outcome === frame.outcome,
    )
    if (!review && alreadySettled) return state
    if (
      !review ||
      review.interactionId !== frame.interactionId ||
      review.patchId !== frame.patchId ||
      review.decisionKey !== frame.decisionKey
    ) {
      return invalidStream(state)
    }
    const nextStage = stagePreservingStop(active, 'running')
    return {
      ...state,
      phase: nextStage,
      transcript: state.transcript.map((entry) =>
        entry.kind === 'review' &&
        entry.operationId === frame.operationId &&
        entry.interactionId === frame.interactionId &&
        entry.patchId === frame.patchId &&
        entry.decisionKey === frame.decisionKey
          ? { ...entry, outcome: frame.outcome }
          : entry,
      ),
      activeOperation: { ...active, stage: nextStage, review: undefined },
    }
  }

  if (frame.type === 'interrupt.acknowledged') {
    return {
      ...state,
      phase: 'stopping',
      transcript: [
        ...state.transcript,
        {
          kind: 'notice',
          code: 'interrupt_acknowledged',
          displayMessage: '중단 요청을 전달했습니다.',
        },
      ],
      activeOperation: {
        ...active,
        stage: 'stopping',
        interrupt: {
          operationId: frame.operationId,
          state: 'acknowledged',
        },
      },
      controlFailure: undefined,
    }
  }

  if (frame.type === 'operation.error') {
    return {
      ...state,
      transcript: [
        ...state.transcript,
        {
          kind: 'notice',
          code: frame.code,
          displayMessage: frame.displayMessage,
          willRetry: frame.willRetry,
        },
      ],
    }
  }

  return invalidStream(state)
}

function reconcileProductReview(
  state: ProductChatState,
  review: ProductReviewBinding,
  outcome: 'accepted' | 'rejected',
): ProductChatState {
  const matchingIndex = state.transcript.findIndex(
    (entry) =>
      entry.kind === 'review' &&
      entry.operationId === review.operationId &&
      entry.interactionId === review.interactionId &&
      entry.patchId === review.patchId &&
      entry.decisionKey === review.decisionKey,
  )
  const entry = state.transcript[matchingIndex]
  if (entry?.kind !== 'review') return invalidStream(state)
  if (entry.outcome !== undefined && entry.outcome !== outcome) {
    return invalidStream(state)
  }
  const active = state.activeOperation
  const activeMatches =
    active?.review?.operationId === review.operationId &&
    active.review.interactionId === review.interactionId &&
    active.review.patchId === review.patchId &&
    active.review.decisionKey === review.decisionKey
  if (active?.review && !activeMatches) return invalidStream(state)
  return {
    ...state,
    transcript: state.transcript.map((candidate, index) =>
      index === matchingIndex && candidate.kind === 'review'
        ? { ...candidate, outcome }
        : candidate,
    ),
    ...(activeMatches && active
      ? {
          phase: state.recovery
            ? state.phase
            : ('running' as const),
          activeOperation: {
            ...active,
            stage: 'running' as const,
            review: undefined,
          },
        }
      : {}),
  }
}

function reduceProductRecovery(
  state: ProductChatState,
  frame: ProductRecoveryBinding,
): ProductChatState {
  const active = state.activeOperation
  const matchesActive =
    active?.kind === 'assignment' &&
    active.operationId === frame.operationId &&
    active.runId === frame.runId
  const matchesLast =
    !active &&
    state.lastAssignment?.operationId === frame.operationId &&
    state.lastAssignment.runId === frame.runId
  if (!matchesActive && !matchesLast) return invalidStream(state)
  if (state.recovery) {
    return sameRecovery(state.recovery, frame) ? state : invalidStream(state)
  }
  const phase =
    frame.outcome === 'continuation_lost'
      ? 'continuation-lost'
      : frame.outcome
  return {
    ...state,
    phase,
    transcript: [
      ...stopStreamingEntries(state.transcript).map((entry) =>
        entry.kind === 'review' &&
        entry.operationId === frame.operationId &&
        entry.outcome === undefined
          ? { ...entry, outcome: 'cancelled' as const }
          : entry,
      ),
      recoveryTranscriptEntry(frame),
    ],
    recovery: { ...frame },
    ...(matchesActive && active
      ? {
          activeOperation: {
            ...active,
            stage:
              active.accepted || frame.outcome !== 'unknown'
                ? ('running' as const)
                : ('preparing' as const),
            accepted: active.accepted || frame.outcome !== 'unknown',
            interaction: undefined,
            review: undefined,
          },
        }
      : {}),
  }
}

function recoveryTranscriptEntry(
  frame: ProductRecoveryBinding,
): ProductRecoveryTranscriptEntry {
  if (frame.outcome === 'continuation_lost') {
    return {
      kind: 'recovery',
      operationId: frame.operationId,
      runId: frame.runId,
      outcome: frame.outcome,
      retryable: frame.retryable,
      confirmedRevision: frame.confirmedRevision,
    }
  }
  return {
    kind: 'recovery',
    operationId: frame.operationId,
    runId: frame.runId,
    outcome: frame.outcome,
    retryable: frame.retryable,
  }
}

function recoveryTerminalPhase(
  recovery: ProductRecoveryBinding | undefined,
  frame: Extract<ProductOperationFrame, { readonly type: 'operation.terminal' }>,
): ProductChatPhase {
  if (
    recovery &&
    'runId' in frame &&
    frame.runId === recovery.runId &&
    frame.operationId === recovery.operationId
  ) {
    if (recovery.outcome === 'continuation_lost') return 'continuation-lost'
    if (frame.status === recovery.outcome) return recovery.outcome
  }
  return terminalPhase(
    frame.status,
    'validationOutcome' in frame ? frame.validationOutcome : undefined,
  )
}

function sameRecovery(
  left: ProductRecoveryBinding,
  right: ProductRecoveryBinding,
): boolean {
  return (
    left.operationId === right.operationId &&
    left.runId === right.runId &&
    left.outcome === right.outcome &&
    left.retryable === right.retryable &&
    ('confirmedRevision' in left
      ? 'confirmedRevision' in right &&
        left.confirmedRevision === right.confirmedRevision
      : !('confirmedRevision' in right))
  )
}

function reduceTextActivity(
  state: ProductChatState,
  frame: Extract<
    ProductOperationFrame,
    {
      readonly type:
        | 'plan.delta'
        | 'plan.completed'
        | 'agent_message.delta'
        | 'agent_message.completed'
    }
  >,
): ProductChatState {
  const kind: ProductTextTranscriptEntry['kind'] = frame.type.startsWith(
    'plan.',
  )
    ? 'plan'
    : 'agent'
  const sameIdentity = findAnyActivity(state.transcript, frame.activityId)
  if (sameIdentity && sameIdentity.kind !== kind) return invalidStream(state)
  const existing = findTextActivity(state.transcript, frame.activityId)

  if (frame.type === 'plan.delta' || frame.type === 'agent_message.delta') {
    if (existing && existing.status !== 'streaming') {
      return invalidStream(state)
    }
    const delta = frame.delta
    return {
      ...state,
      transcript: existing
        ? state.transcript.map((entry) =>
            entry.kind === kind && entry.activityId === frame.activityId
              ? { ...entry, text: `${entry.text}${delta}` }
              : entry,
          )
        : [
            ...state.transcript,
            {
              kind,
              activityId: frame.activityId,
              text: delta,
              status: 'streaming',
            },
          ],
    }
  }

  const text = 'text' in frame ? frame.text : ''
  if (existing?.status === 'completed') {
    return existing.text === text ? state : invalidStream(state)
  }
  const completed: ProductTextTranscriptEntry = {
    kind,
    activityId: frame.activityId,
    text,
    status: 'completed' as const,
  }
  return {
    ...state,
    transcript: existing
      ? state.transcript.map((entry) =>
          entry.kind === kind && entry.activityId === frame.activityId
            ? completed
            : entry,
        )
      : [...state.transcript, completed],
  }
}

function findActivity(
  transcript: readonly ProductTranscriptEntry[],
  kind: 'plan' | 'agent' | 'mcp',
  activityId: string,
): ProductTranscriptEntry | undefined {
  return transcript.find(
    (entry) =>
      (entry.kind === 'plan' ||
        entry.kind === 'agent' ||
        entry.kind === 'mcp') &&
      entry.activityId === activityId &&
      entry.kind === kind,
  )
}

function findAnyActivity(
  transcript: readonly ProductTranscriptEntry[],
  activityId: string,
): Extract<ProductTranscriptEntry, { readonly activityId: string }> | undefined {
  return transcript.find(
    (
      entry,
    ): entry is Extract<
      ProductTranscriptEntry,
      { readonly activityId: string }
    > =>
      (entry.kind === 'plan' ||
        entry.kind === 'agent' ||
        entry.kind === 'mcp') &&
      entry.activityId === activityId,
  )
}

function findTextActivity(
  transcript: readonly ProductTranscriptEntry[],
  activityId: string,
): ProductTextTranscriptEntry | undefined {
  return transcript.find(
    (entry): entry is ProductTextTranscriptEntry =>
      (entry.kind === 'plan' || entry.kind === 'agent') &&
      entry.activityId === activityId,
  )
}

function updateLastOperation(
  transcript: readonly ProductTranscriptEntry[],
  status: 'preparing' | 'accepted',
): readonly ProductTranscriptEntry[] {
  const index = transcript.findLastIndex((entry) => entry.kind === 'operation')
  if (index < 0) return transcript
  return transcript.map((entry, candidate) =>
    candidate === index && entry.kind === 'operation'
      ? {
          ...entry,
          status,
          milestones: entry.milestones.includes(status)
            ? entry.milestones
            : [...entry.milestones, status],
        }
      : entry,
  )
}

function matchesOperationKind(
  kind: ProductOperationKind,
  operationId: string,
): boolean {
  return operationId.startsWith(kind === 'assignment' ? 'action_' : 'chat_')
}

function matchesOperation(
  active: ProductActiveOperation,
  operationId: string,
): boolean {
  return active.operationId === operationId
}

function matchesRun(
  active: ProductActiveOperation,
  frame: { readonly runId?: string },
): boolean {
  const runId = 'runId' in frame ? frame.runId : undefined
  return active.kind === 'assignment'
    ? active.runId !== undefined && active.runId === runId
    : active.runId === undefined && runId === undefined
}

function isAllowedTerminalSettlement(
  active: ProductActiveOperation,
  status: Extract<
    ProductOperationFrame,
    { readonly type: 'operation.terminal' }
  >['status'],
): boolean {
  if (!active.accepted) {
    if (active.stage !== 'preparing') return false
    return (
      status === 'not_accepted' ||
      status === 'unknown' ||
      (active.kind === 'assignment' &&
        (status === 'acceptance_unknown' || status === 'failed'))
    )
  }
  return (
    status === 'completed' ||
    status === 'failed' ||
    status === 'interrupted' ||
    status === 'unknown'
  )
}

function validReviewPatch(
  patch: ProductStatePatch,
  selected: readonly ProductMaterialSelection[],
): boolean {
  if (patch.status !== 'pending') return false
  const sources = new Map(
    selected.map((material) => [material.id, material.digest] as const),
  )
  const fields = new Set<ProductStatePatch['evidence'][number]['field']>()
  for (const evidence of patch.evidence) {
    if (sources.get(evidence.rawMaterialId) !== evidence.digest) return false
    fields.add(evidence.field)
  }
  return (
    fields.has('title') &&
    fields.has('dueAt') &&
    fields.has('submissionMethod')
  )
}

function hasMatchingCompletedMcp(
  transcript: readonly ProductTranscriptEntry[],
  patchId: string,
): boolean {
  return transcript.some(
    (entry) =>
      entry.kind === 'mcp' &&
      entry.status === 'completed' &&
      entry.patch?.id === patchId,
  )
}

function clonePatch(patch: ProductStatePatch): ProductStatePatch {
  return {
    ...patch,
    changes: {
      ...patch.changes,
      values: { ...patch.changes.values },
    },
    evidence: patch.evidence.map((evidence) => ({ ...evidence })),
  }
}

function cloneQuestion(question: ProductQuestion): ProductQuestion {
  return {
    ...question,
    options: question.options?.map((option) => ({ ...option })) ?? null,
  }
}

function stopStreamingEntries(
  transcript: readonly ProductTranscriptEntry[],
): readonly ProductTranscriptEntry[] {
  return transcript.map((entry) =>
    (entry.kind === 'plan' || entry.kind === 'agent') &&
    entry.status === 'streaming'
      ? { ...entry, status: 'stopped' }
      : entry,
  )
}

function invalidStream(state: ProductChatState): ProductChatState {
  if (
    state.phase === 'stream-failed' &&
    state.failure?.code === invalidStreamFailure.code
  ) {
    return state
  }
  return {
    ...state,
    phase: 'stream-failed',
    transcript: stopStreamingEntries(state.transcript),
    activeOperation: undefined,
    failure: invalidStreamFailure,
  }
}

function phaseForActiveOperation(
  operation: ProductActiveOperation,
): ProductChatPhase {
  if (operation.review) return 'awaiting-review'
  if (operation.interaction) return 'awaiting-clarification'
  return 'running'
}

function stagePreservingStop<
  NextStage extends 'running' | 'awaiting-clarification' | 'awaiting-review',
>(
  operation: ProductActiveOperation,
  nextStage: NextStage,
): NextStage | 'stopping' {
  return operation.stage === 'stopping' ? 'stopping' : nextStage
}

function terminalPhase(
  status: Extract<
    ProductOperationFrame,
    { readonly type: 'operation.terminal' }
  >['status'],
  validationOutcome: 'passed' | 'failed' | 'unknown' | undefined,
): ProductChatPhase {
  if (status === 'completed' && validationOutcome !== 'failed') {
    return 'completed'
  }
  if (status === 'interrupted') return 'interrupted'
  if (status === 'unknown' || status === 'acceptance_unknown') return 'unknown'
  return 'failed'
}

function isTerminalPhase(phase: ProductChatPhase): boolean {
  return (
    phase === 'completed' ||
    phase === 'interrupted' ||
    phase === 'continuation-lost' ||
    phase === 'failed' ||
    phase === 'unknown'
  )
}
