import type {
  CodexChatStreamFrame,
  CodexChatTurnErrorCode,
  CodexTurnStatus,
} from '@ay-ple/codex-chat-runtime/contract'

export type ChatPhase =
  | 'empty'
  | 'ready'
  | 'submitting'
  | 'running'
  | 'completed'
  | 'interrupted'
  | 'turn-failed'
  | 'request-failed'
  | 'runtime-failed'

export type ChatMessage =
  | {
      readonly kind: 'user'
      readonly text: string
      readonly turnId?: string
    }
  | {
      readonly kind: 'agent'
      readonly itemId: string
      readonly turnId: string
      readonly text: string
      readonly status: 'streaming' | 'completed' | 'stopped'
    }

export type ChatTurnNotice = {
  readonly turnId: string
  readonly willRetry: boolean
  readonly code: CodexChatTurnErrorCode
  readonly displayMessage: string
}

export type ChatFailure = {
  readonly code: string
  readonly displayMessage: string
}

export type ChatState = {
  readonly phase: ChatPhase
  readonly threadId?: string
  readonly activeTurnId?: string
  readonly messages: readonly ChatMessage[]
  readonly notices: readonly ChatTurnNotice[]
  readonly terminal?: {
    readonly turnId: string
    readonly status: CodexTurnStatus
  }
  readonly failure?: ChatFailure
}

export type ChatAction =
  | { readonly type: 'thread.started'; readonly threadId: string }
  | { readonly type: 'turn.submitted'; readonly text: string }
  | {
      readonly type: 'stream.frame'
      readonly frame: CodexChatStreamFrame
    }
  | {
      readonly type: 'turn.request-failed'
      readonly failure: ChatFailure
    }
  | { readonly type: 'stream.failed' }

const INVALID_STREAM_FAILURE = {
  code: 'invalid_stream',
  displayMessage: '대화 스트림을 확인할 수 없습니다.',
} as const

export function createInitialChatState(): ChatState {
  return {
    phase: 'empty',
    messages: [],
    notices: [],
  }
}

export function reduceChatState(
  state: ChatState,
  action: ChatAction,
): ChatState {
  if (action.type === 'thread.started') {
    if (action.threadId.length === 0 || isTurnActive(state)) return state
    return {
      phase: 'ready',
      threadId: action.threadId,
      messages: [],
      notices: [],
    }
  }
  if (action.type === 'turn.submitted') {
    if (
      state.phase !== 'ready' ||
      state.threadId === undefined ||
      action.text.trim().length === 0
    ) {
      return state
    }
    return {
      ...state,
      phase: 'submitting',
      messages: [...state.messages, { kind: 'user', text: action.text }],
      failure: undefined,
      terminal: undefined,
    }
  }
  if (action.type === 'turn.request-failed') {
    if (state.phase !== 'submitting') return invalidStream(state)
    return {
      ...state,
      phase: 'request-failed',
      activeTurnId: undefined,
      terminal: undefined,
      failure: { ...action.failure },
    }
  }
  if (action.type === 'stream.failed') return invalidStream(state)
  return reduceStreamFrame(state, action.frame)
}

function reduceStreamFrame(
  state: ChatState,
  frame: CodexChatStreamFrame,
): ChatState {
  if (frame.type === 'turn.accepted') {
    if (
      state.phase !== 'submitting' ||
      state.threadId !== frame.threadId ||
      state.activeTurnId !== undefined
    ) {
      return invalidStream(state)
    }
    return {
      ...state,
      phase: 'running',
      activeTurnId: frame.turnId,
      messages: acceptPendingUser(state.messages, frame.turnId),
    }
  }
  if (frame.type === 'runtime.failed') {
    if (!isTurnActive(state)) return invalidStream(state)
    return {
      ...state,
      phase: 'runtime-failed',
      activeTurnId: undefined,
      messages: stopStreamingMessages(state.messages, state.activeTurnId),
      terminal: undefined,
      failure: {
        code: frame.code,
        displayMessage: frame.displayMessage,
      },
    }
  }
  if (!matchesActiveScope(state, frame.threadId, frame.turnId)) {
    return invalidStream(state)
  }
  if (frame.type === 'agent_message.delta') {
    const existing = findAgentMessage(state.messages, frame.itemId)
    if (existing?.status === 'completed') return invalidStream(state)
    if (existing && existing.turnId !== frame.turnId) {
      return invalidStream(state)
    }
    return {
      ...state,
      messages: existing
        ? state.messages.map((message) =>
            message.kind === 'agent' && message.itemId === frame.itemId
              ? { ...message, text: `${message.text}${frame.delta}` }
              : message,
          )
        : [
            ...state.messages,
            {
              kind: 'agent',
              itemId: frame.itemId,
              turnId: frame.turnId,
              text: frame.delta,
              status: 'streaming',
            },
          ],
    }
  }
  if (frame.type === 'agent_message.completed') {
    const existing = findAgentMessage(state.messages, frame.itemId)
    if (
      existing?.status === 'completed' &&
      existing.text !== frame.text
    ) {
      return invalidStream(state)
    }
    if (existing && existing.turnId !== frame.turnId) {
      return invalidStream(state)
    }
    if (existing?.status === 'completed') return state
    const completed: ChatMessage = {
      kind: 'agent',
      itemId: frame.itemId,
      turnId: frame.turnId,
      text: frame.text,
      status: 'completed',
    }
    return {
      ...state,
      messages: existing
        ? state.messages.map((message) =>
            message.kind === 'agent' && message.itemId === frame.itemId
              ? completed
              : message,
          )
        : [...state.messages, completed],
    }
  }
  if (frame.type === 'turn.error') {
    return {
      ...state,
      notices: [
        ...state.notices,
        {
          turnId: frame.turnId,
          willRetry: frame.willRetry,
          code: frame.code,
          displayMessage: frame.displayMessage,
        },
      ],
    }
  }
  const phase = terminalPhase(frame.status)
  return {
    ...state,
    phase,
    activeTurnId: undefined,
    messages: stopStreamingMessages(state.messages, frame.turnId),
    terminal: {
      turnId: frame.turnId,
      status: frame.status,
    },
    failure:
      frame.status === 'failed' && frame.failure
        ? { ...frame.failure }
        : undefined,
  }
}

function acceptPendingUser(
  messages: readonly ChatMessage[],
  turnId: string,
): readonly ChatMessage[] {
  const pendingIndex = messages.findLastIndex(
    (message) => message.kind === 'user' && message.turnId === undefined,
  )
  if (pendingIndex < 0) return messages
  return messages.map((message, index) =>
    index === pendingIndex && message.kind === 'user'
      ? { ...message, turnId }
      : message,
  )
}

function findAgentMessage(
  messages: readonly ChatMessage[],
  itemId: string,
): Extract<ChatMessage, { kind: 'agent' }> | undefined {
  return messages.find(
    (message): message is Extract<ChatMessage, { kind: 'agent' }> =>
      message.kind === 'agent' && message.itemId === itemId,
  )
}

function stopStreamingMessages(
  messages: readonly ChatMessage[],
  turnId: string | undefined,
): readonly ChatMessage[] {
  if (turnId === undefined) return messages
  return messages.map((message) =>
    message.kind === 'agent' &&
    message.turnId === turnId &&
    message.status === 'streaming'
      ? { ...message, status: 'stopped' }
      : message,
  )
}

function matchesActiveScope(
  state: ChatState,
  threadId: string,
  turnId: string,
): boolean {
  return (
    state.phase === 'running' &&
    state.threadId === threadId &&
    state.activeTurnId === turnId
  )
}

function isTurnActive(state: ChatState): boolean {
  return state.phase === 'submitting' || state.phase === 'running'
}

function invalidStream(state: ChatState): ChatState {
  if (
    state.phase === 'runtime-failed' &&
    state.failure?.code === INVALID_STREAM_FAILURE.code
  ) {
    return state
  }
  return {
    ...state,
    phase: 'runtime-failed',
    activeTurnId: undefined,
    messages: stopStreamingMessages(state.messages, state.activeTurnId),
    terminal: undefined,
    failure: INVALID_STREAM_FAILURE,
  }
}

function terminalPhase(status: CodexTurnStatus): ChatPhase {
  if (status === 'completed') return 'completed'
  if (status === 'interrupted') return 'interrupted'
  return 'turn-failed'
}
