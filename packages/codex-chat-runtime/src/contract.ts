import type { CodexChatRuntimeError } from './errors.js'

export type CodexThreadId = string
export type CodexTurnId = string
export type CodexItemId = string
export type CodexInteractionId = string
export type CodexTurnStatus = 'completed' | 'interrupted' | 'failed'
export type CodexAccountReadiness =
  | { readonly state: 'ready' }
  | {
      readonly state: 'not_ready'
      readonly reason: 'authentication_required'
    }
export const CODEX_CHAT_APPROVAL_MODE = 'deny_all' as const
export const CODEX_CHAT_SANDBOX = 'read_only' as const
export const CODEX_CHAT_TURN_ERROR_CODES = [
  'activeTurnNotSteerable',
  'badRequest',
  'contextWindowExceeded',
  'cyberPolicy',
  'httpConnectionFailed',
  'internalServerError',
  'other',
  'responseStreamConnectionFailed',
  'responseStreamDisconnected',
  'responseTooManyFailedAttempts',
  'sandboxError',
  'serverOverloaded',
  'sessionBudgetExceeded',
  'threadRollbackFailed',
  'turn_error',
  'unauthorized',
  'usageLimitExceeded',
] as const
export type CodexChatTurnErrorCode =
  (typeof CODEX_CHAT_TURN_ERROR_CODES)[number]

const CODEX_CHAT_TURN_ERROR_CODE_SET = new Set<string>(
  CODEX_CHAT_TURN_ERROR_CODES,
)

export type AgentMessageDeltaEvent = {
  readonly type: 'agent_message.delta'
  readonly threadId: CodexThreadId
  readonly turnId: CodexTurnId
  readonly itemId: CodexItemId
  readonly delta: string
}

export type AgentMessageCompletedEvent = {
  readonly type: 'agent_message.completed'
  readonly threadId: CodexThreadId
  readonly turnId: CodexTurnId
  readonly itemId: CodexItemId
  readonly text: string
}

export type TurnErrorEvent = {
  readonly type: 'turn.error'
  readonly threadId: CodexThreadId
  readonly turnId: CodexTurnId
  readonly willRetry: boolean
  readonly code: CodexChatTurnErrorCode
  readonly displayMessage: string
}

export type TurnCompletedEvent = {
  readonly type: 'turn.completed'
  readonly threadId: CodexThreadId
  readonly turnId: CodexTurnId
  readonly status: CodexTurnStatus
  readonly failure?: {
    readonly code: CodexChatTurnErrorCode
    readonly displayMessage: string
  }
}

export type RuntimeFailedEvent = {
  readonly type: 'runtime.failed'
  readonly code: string
  readonly displayMessage: string
  readonly mutationOutcomeKnown: boolean
}

export type CodexUserInputOption = {
  readonly label: string
  readonly description: string
}

export type CodexUserInputQuestion = {
  readonly id: string
  readonly header: string
  readonly question: string
  readonly options: readonly CodexUserInputOption[] | null
  readonly acceptsFreeform: boolean
}

export type UserInputRequestedEvent = {
  readonly type: 'user_input.requested'
  readonly threadId: CodexThreadId
  readonly turnId: CodexTurnId
  readonly itemId: CodexItemId
  readonly interactionId: CodexInteractionId
  readonly questions: readonly CodexUserInputQuestion[]
}

export type SkillRequestedEvent = {
  readonly type: 'skill.requested'
  readonly threadId: CodexThreadId
  readonly turnId: CodexTurnId
  readonly skillName: string
}

export type UserInputResolvedEvent = {
  readonly type: 'user_input.resolved'
  readonly threadId: CodexThreadId
  readonly turnId: CodexTurnId
  readonly itemId: CodexItemId
  readonly interactionId: CodexInteractionId
  readonly resolution: 'answered' | 'cancelled'
}

export type PlanDeltaEvent = {
  readonly type: 'plan.delta'
  readonly threadId: CodexThreadId
  readonly turnId: CodexTurnId
  readonly itemId: CodexItemId
  readonly delta: string
}

export type PlanCompletedEvent = {
  readonly type: 'plan.completed'
  readonly threadId: CodexThreadId
  readonly turnId: CodexTurnId
  readonly itemId: CodexItemId
  readonly text: string
}

type McpCallBase = {
  readonly threadId: CodexThreadId
  readonly turnId: CodexTurnId
  readonly itemId: CodexItemId
  readonly tool: 'propose_state_patch'
}

export type McpCallStartedEvent = McpCallBase & {
  readonly type: 'mcp_call.started'
}

export type McpCallCompletedEvent = McpCallBase & {
  readonly type: 'mcp_call.completed'
}

export type McpCallFailedEvent = McpCallBase & {
  readonly type: 'mcp_call.failed'
  readonly displayMessage: 'The product proposal tool failed.'
}

export type TurnInterruptAcknowledgedEvent = {
  readonly type: 'turn.interrupt_acknowledged'
  readonly threadId: CodexThreadId
  readonly turnId: CodexTurnId
}

export type CodexChatEvent =
  | AgentMessageDeltaEvent
  | AgentMessageCompletedEvent
  | TurnErrorEvent
  | TurnCompletedEvent
  | RuntimeFailedEvent

export type CodexProductActivity =
  | CodexChatEvent
  | PlanDeltaEvent
  | PlanCompletedEvent
  | McpCallStartedEvent
  | McpCallCompletedEvent
  | McpCallFailedEvent
  | SkillRequestedEvent
  | TurnInterruptAcknowledgedEvent
  | UserInputRequestedEvent
  | UserInputResolvedEvent

export type CodexChatRuntimeEvidence = {
  readonly sourceCommit: string
  readonly runtimeVersion: string
}

type CodexChatStatusPolicy = {
  readonly approvalMode: typeof CODEX_CHAT_APPROVAL_MODE
  readonly sandbox: typeof CODEX_CHAT_SANDBOX
}

export type CodexChatStatus =
  | (CodexChatStatusPolicy & {
      readonly state: 'unavailable'
      readonly reason:
        | 'not_configured'
        | 'invalid_configuration'
        | 'runtime_missing'
    })
  | (CodexChatStatusPolicy &
      CodexChatRuntimeEvidence & {
        readonly state: 'configured' | 'starting' | 'ready'
      })
  | (CodexChatStatusPolicy &
      CodexChatRuntimeEvidence & {
        readonly state: 'failed'
        readonly failureCode: string
      })

export type CodexChatTurnAccepted = {
  readonly type: 'turn.accepted'
  readonly threadId: CodexThreadId
  readonly turnId: CodexTurnId
}

export type CodexChatStreamFrame = CodexChatTurnAccepted | CodexChatEvent

export type CodexChatThread = {
  readonly threadId: CodexThreadId
}

export type CodexChatTurn = {
  readonly threadId: CodexThreadId
  readonly turnId: CodexTurnId
  readonly events: AsyncIterable<CodexChatEvent>
}

export type StartTurnInput = {
  readonly threadId: CodexThreadId
  readonly text: string
}

export type CodexPrivateMcpServerInput = {
  readonly url: string
  readonly token: string
}

export type StartThreadInput = {
  readonly workspace: string
  readonly mcp: CodexPrivateMcpServerInput
}

export type InterruptTurnInput = {
  readonly threadId: CodexThreadId
  readonly turnId: CodexTurnId
}

export type ReleaseThreadInput = {
  readonly threadId: CodexThreadId
}

export interface CodexChatRuntime {
  readonly terminal: Promise<CodexChatRuntimeError>
  startThread(input?: StartThreadInput): Promise<CodexChatThread>
  startTurn(input: StartTurnInput): Promise<CodexChatTurn>
  interrupt(input: InterruptTurnInput): Promise<void>
  releaseThread(input: ReleaseThreadInput): Promise<void>
  close(): Promise<void>
}

export function parseCodexChatStatus(value: unknown): CodexChatStatus {
  const status = requireRecord(value)
  const state = requireString(status.state)
  const policy = {
    approvalMode: requireApprovalMode(status.approvalMode),
    sandbox: requireSandbox(status.sandbox),
  }
  if (state === 'unavailable') {
    requireExactKeys(status, [
      'state',
      'approvalMode',
      'sandbox',
      'reason',
    ])
    return {
      ...policy,
      state,
      reason: requireUnavailableReason(status.reason),
    }
  }
  if (state === 'configured' || state === 'starting' || state === 'ready') {
    requireExactKeys(status, [
      'state',
      'approvalMode',
      'sandbox',
      'sourceCommit',
      'runtimeVersion',
    ])
    return {
      ...policy,
      state,
      sourceCommit: requireNonemptyString(status.sourceCommit),
      runtimeVersion: requireNonemptyString(status.runtimeVersion),
    }
  }
  if (state === 'failed') {
    requireExactKeys(status, [
      'state',
      'approvalMode',
      'sandbox',
      'sourceCommit',
      'runtimeVersion',
      'failureCode',
    ])
    return {
      ...policy,
      state,
      sourceCommit: requireNonemptyString(status.sourceCommit),
      runtimeVersion: requireNonemptyString(status.runtimeVersion),
      failureCode: requireNonemptyString(status.failureCode),
    }
  }
  throw new TypeError('Unknown Codex chat status')
}

export function parseCodexChatThread(value: unknown): CodexChatThread {
  const thread = requireRecord(value)
  requireExactKeys(thread, ['threadId'])
  return { threadId: requireNonemptyString(thread.threadId) }
}

export function parseCodexChatStreamFrame(
  value: unknown,
): CodexChatStreamFrame {
  const frame = requireRecord(value)
  if (requireString(frame.type) !== 'turn.accepted') {
    return parseCodexChatEvent(frame)
  }
  requireExactKeys(frame, ['type', 'threadId', 'turnId'])
  return {
    type: 'turn.accepted',
    threadId: requireNonemptyString(frame.threadId),
    turnId: requireNonemptyString(frame.turnId),
  }
}

export function parseCodexChatEvent(value: unknown): CodexChatEvent {
  const event = requireRecord(value)
  const type = requireString(event.type)
  if (type === 'agent_message.delta') {
    requireExactKeys(event, [
      'type',
      'threadId',
      'turnId',
      'itemId',
      'delta',
    ])
    return {
      type,
      threadId: requireNonemptyString(event.threadId),
      turnId: requireNonemptyString(event.turnId),
      itemId: requireNonemptyString(event.itemId),
      delta: requireString(event.delta),
    }
  }
  if (type === 'agent_message.completed') {
    requireExactKeys(event, [
      'type',
      'threadId',
      'turnId',
      'itemId',
      'text',
    ])
    return {
      type,
      threadId: requireNonemptyString(event.threadId),
      turnId: requireNonemptyString(event.turnId),
      itemId: requireNonemptyString(event.itemId),
      text: requireString(event.text),
    }
  }
  if (type === 'turn.error') {
    requireExactKeys(event, [
      'type',
      'threadId',
      'turnId',
      'willRetry',
      'code',
      'displayMessage',
    ])
    const displayMessage = requireNonemptyString(event.displayMessage)
    if (displayMessage !== 'Codex reported a turn error.') {
      throw new TypeError('Invalid Codex turn error display message')
    }
    return {
      type,
      threadId: requireNonemptyString(event.threadId),
      turnId: requireNonemptyString(event.turnId),
      willRetry: requireBoolean(event.willRetry),
      code: requireCodexChatTurnErrorCode(event.code),
      displayMessage,
    }
  }
  if (type === 'turn.completed') {
    const status = requireTurnStatus(event.status)
    const expectedKeys = [
      'type',
      'threadId',
      'turnId',
      'status',
      ...(status === 'failed' ? ['failure'] : []),
    ]
    requireExactKeys(event, expectedKeys)
    const base = {
      type,
      threadId: requireNonemptyString(event.threadId),
      turnId: requireNonemptyString(event.turnId),
      status,
    } as const
    if (status !== 'failed') return base
    const failure = requireRecord(event.failure)
    requireExactKeys(failure, ['code', 'displayMessage'])
    const displayMessage = requireNonemptyString(failure.displayMessage)
    if (displayMessage !== 'Codex failed the turn.') {
      throw new TypeError('Invalid Codex turn failure display message')
    }
    return {
      ...base,
      failure: {
        code: requireCodexChatTurnErrorCode(failure.code),
        displayMessage,
      },
    }
  }
  if (type === 'runtime.failed') {
    requireExactKeys(event, [
      'type',
      'code',
      'displayMessage',
      'mutationOutcomeKnown',
    ])
    return {
      type,
      code: requireNonemptyString(event.code),
      displayMessage: requireNonemptyString(event.displayMessage),
      mutationOutcomeKnown: requireBoolean(event.mutationOutcomeKnown),
    }
  }
  throw new TypeError('Unknown Codex chat event type')
}

export function parseCodexProductActivity(value: unknown): CodexProductActivity {
  const activity = requireRecord(value)
  if (activity.type === 'plan.delta' || activity.type === 'plan.completed') {
    const contentKey = activity.type === 'plan.delta' ? 'delta' : 'text'
    requireExactKeys(activity, [
      'type',
      'threadId',
      'turnId',
      'itemId',
      contentKey,
    ])
    const identity = {
      threadId: requireNonemptyString(activity.threadId),
      turnId: requireNonemptyString(activity.turnId),
      itemId: requireNonemptyString(activity.itemId),
    }
    return activity.type === 'plan.delta'
      ? {
          type: 'plan.delta',
          ...identity,
          delta: requireString(activity.delta),
        }
      : {
          type: 'plan.completed',
          ...identity,
          text: requireString(activity.text),
        }
  }
  if (
    activity.type === 'mcp_call.started' ||
    activity.type === 'mcp_call.completed' ||
    activity.type === 'mcp_call.failed'
  ) {
    requireExactKeys(activity, [
      'type',
      'threadId',
      'turnId',
      'itemId',
      'tool',
      ...(activity.type === 'mcp_call.failed' ? ['displayMessage'] : []),
    ])
    if (activity.tool !== 'propose_state_patch') {
      throw new TypeError('Invalid Codex product MCP tool')
    }
    const base = {
      threadId: requireNonemptyString(activity.threadId),
      turnId: requireNonemptyString(activity.turnId),
      itemId: requireNonemptyString(activity.itemId),
      tool: 'propose_state_patch' as const,
    }
    if (activity.type === 'mcp_call.started') {
      return { type: 'mcp_call.started', ...base }
    }
    if (activity.type === 'mcp_call.completed') {
      return { type: 'mcp_call.completed', ...base }
    }
    if (activity.displayMessage !== 'The product proposal tool failed.') {
      throw new TypeError('Invalid Codex product MCP failure message')
    }
    return {
      type: 'mcp_call.failed',
      ...base,
      displayMessage: activity.displayMessage,
    }
  }
  if (activity.type === 'turn.interrupt_acknowledged') {
    requireExactKeys(activity, ['type', 'threadId', 'turnId'])
    return {
      type: 'turn.interrupt_acknowledged',
      threadId: requireNonemptyString(activity.threadId),
      turnId: requireNonemptyString(activity.turnId),
    }
  }
  if (activity.type === 'skill.requested') {
    requireExactKeys(activity, ['type', 'threadId', 'turnId', 'skillName'])
    return {
      type: 'skill.requested',
      threadId: requireNonemptyString(activity.threadId),
      turnId: requireNonemptyString(activity.turnId),
      skillName: requireNonemptyString(activity.skillName),
    }
  }
  if (activity.type === 'user_input.resolved') {
    requireExactKeys(activity, [
      'type',
      'threadId',
      'turnId',
      'itemId',
      'interactionId',
      'resolution',
    ])
    if (activity.resolution !== 'answered' && activity.resolution !== 'cancelled') {
      throw new TypeError('Invalid Codex user-input resolution')
    }
    return {
      type: 'user_input.resolved',
      threadId: requireNonemptyString(activity.threadId),
      turnId: requireNonemptyString(activity.turnId),
      itemId: requireNonemptyString(activity.itemId),
      interactionId: requireNonemptyString(activity.interactionId),
      resolution: activity.resolution,
    }
  }
  if (activity.type !== 'user_input.requested') {
    return parseCodexChatEvent(activity)
  }
  requireExactKeys(activity, [
    'type',
    'threadId',
    'turnId',
    'itemId',
    'interactionId',
    'questions',
  ])
  const questions = requireArray(activity.questions)
  if (questions.length < 1 || questions.length > 3) {
    throw new TypeError('Invalid Codex user-input question count')
  }
  return {
    type: 'user_input.requested',
    threadId: requireNonemptyString(activity.threadId),
    turnId: requireNonemptyString(activity.turnId),
    itemId: requireNonemptyString(activity.itemId),
    interactionId: requireNonemptyString(activity.interactionId),
    questions: questions.map(parseUserInputQuestion),
  }
}

export function isCodexChatTurnErrorCode(
  value: unknown,
): value is CodexChatTurnErrorCode {
  return typeof value === 'string' && CODEX_CHAT_TURN_ERROR_CODE_SET.has(value)
}

function requireCodexChatTurnErrorCode(
  value: unknown,
): CodexChatTurnErrorCode {
  if (!isCodexChatTurnErrorCode(value)) {
    throw new TypeError('Invalid Codex turn error code')
  }
  return value
}

function requireRecord(value: unknown): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new TypeError('Expected an object')
  }
  return value as Record<string, unknown>
}

function requireArray(value: unknown): readonly unknown[] {
  if (!Array.isArray(value)) throw new TypeError('Expected an array')
  return value
}

function parseUserInputQuestion(value: unknown): CodexUserInputQuestion {
  const question = requireRecord(value)
  requireExactKeys(question, [
    'id',
    'header',
    'question',
    'options',
    'acceptsFreeform',
  ])
  const rawOptions = question.options
  const options =
    rawOptions === null
      ? null
      : requireArray(rawOptions).map((value): CodexUserInputOption => {
          const option = requireRecord(value)
          requireExactKeys(option, ['label', 'description'])
          return {
            label: requireNonemptyString(option.label),
            description: requireString(option.description),
          }
        })
  return {
    id: requireNonemptyString(question.id),
    header: requireNonemptyString(question.header),
    question: requireNonemptyString(question.question),
    options,
    acceptsFreeform: requireBoolean(question.acceptsFreeform),
  }
}

function requireExactKeys(
  value: Record<string, unknown>,
  expected: readonly string[],
): void {
  const actual = Object.keys(value).sort()
  const wanted = [...expected].sort()
  if (
    actual.length !== wanted.length ||
    actual.some((key, index) => key !== wanted[index])
  ) {
    throw new TypeError('Unexpected event fields')
  }
}

function requireString(value: unknown): string {
  if (typeof value !== 'string') throw new TypeError('Expected a string')
  return value
}

function requireNonemptyString(value: unknown): string {
  const text = requireString(value)
  if (text.length === 0) throw new TypeError('Expected a nonempty string')
  return text
}

function requireBoolean(value: unknown): boolean {
  if (typeof value !== 'boolean') throw new TypeError('Expected a boolean')
  return value
}

function requireApprovalMode(
  value: unknown,
): typeof CODEX_CHAT_APPROVAL_MODE {
  if (value !== CODEX_CHAT_APPROVAL_MODE) {
    throw new TypeError('Invalid Codex chat approval mode')
  }
  return value
}

function requireSandbox(value: unknown): typeof CODEX_CHAT_SANDBOX {
  if (value !== CODEX_CHAT_SANDBOX) {
    throw new TypeError('Invalid Codex chat sandbox')
  }
  return value
}

function requireUnavailableReason(
  value: unknown,
): Extract<CodexChatStatus, { state: 'unavailable' }>['reason'] {
  if (
    value === 'not_configured' ||
    value === 'invalid_configuration' ||
    value === 'runtime_missing'
  ) {
    return value
  }
  throw new TypeError('Invalid Codex chat unavailable reason')
}

function requireTurnStatus(value: unknown): CodexTurnStatus {
  if (value === 'completed' || value === 'interrupted' || value === 'failed') {
    return value
  }
  throw new TypeError('Unknown turn status')
}
