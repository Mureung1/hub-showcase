export type CodexThreadId = string
export type CodexTurnId = string
export type CodexItemId = string
export type CodexTurnStatus = 'completed' | 'interrupted' | 'failed'

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
  readonly code: string
  readonly displayMessage: string
}

export type TurnCompletedEvent = {
  readonly type: 'turn.completed'
  readonly threadId: CodexThreadId
  readonly turnId: CodexTurnId
  readonly status: CodexTurnStatus
  readonly failure?: {
    readonly code: string
    readonly displayMessage: string
  }
}

export type RuntimeFailedEvent = {
  readonly type: 'runtime.failed'
  readonly code: string
  readonly displayMessage: string
  readonly mutationOutcomeKnown: boolean
}

export type CodexChatEvent =
  | AgentMessageDeltaEvent
  | AgentMessageCompletedEvent
  | TurnErrorEvent
  | TurnCompletedEvent
  | RuntimeFailedEvent

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

export type InterruptTurnInput = {
  readonly threadId: CodexThreadId
  readonly turnId: CodexTurnId
}

export type ReleaseThreadInput = {
  readonly threadId: CodexThreadId
}

export interface CodexChatRuntime {
  startThread(): Promise<CodexChatThread>
  startTurn(input: StartTurnInput): Promise<CodexChatTurn>
  interrupt(input: InterruptTurnInput): Promise<void>
  releaseThread(input: ReleaseThreadInput): Promise<void>
  close(): Promise<void>
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
    return {
      type,
      threadId: requireNonemptyString(event.threadId),
      turnId: requireNonemptyString(event.turnId),
      willRetry: requireBoolean(event.willRetry),
      code: requireNonemptyString(event.code),
      displayMessage: requireNonemptyString(event.displayMessage),
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
    return {
      ...base,
      failure: {
        code: requireNonemptyString(failure.code),
        displayMessage: requireNonemptyString(failure.displayMessage),
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

function requireRecord(value: unknown): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new TypeError('Expected an object')
  }
  return value as Record<string, unknown>
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

function requireTurnStatus(value: unknown): CodexTurnStatus {
  if (value === 'completed' || value === 'interrupted' || value === 'failed') {
    return value
  }
  throw new TypeError('Unknown turn status')
}
