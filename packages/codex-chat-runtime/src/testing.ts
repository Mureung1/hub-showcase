import type {
  CodexChatEvent,
  CodexChatRuntime,
  CodexChatThread,
  CodexChatTurn,
  CodexThreadId,
  CodexTurnId,
  InterruptTurnInput,
  ReleaseThreadInput,
  StartTurnInput,
} from './contract.js'

export {
  startCodexChatProcessTreeTestFixture,
  type CodexChatProcessTreeTestFixture,
  type CodexChatTestProcessTree,
} from './testing-process-tree.js'

export type DeterministicCodexChatRuntimeCall =
  | { readonly operation: 'startThread' }
  | {
      readonly operation: 'startTurn'
      readonly input: StartTurnInput
    }
  | {
      readonly operation: 'interrupt'
      readonly input: InterruptTurnInput
    }
  | {
      readonly operation: 'releaseThread'
      readonly input: ReleaseThreadInput
    }
  | { readonly operation: 'close' }

export type DeterministicCodexChatTurn = {
  readonly input: StartTurnInput
  readonly turnId: CodexTurnId
  readonly events: readonly CodexChatEvent[]
}

export type DeterministicCodexChatRuntimeOptions = {
  readonly threadIds?: readonly CodexThreadId[]
  readonly turns?: readonly DeterministicCodexChatTurn[]
}

export class DeterministicCodexChatRuntime implements CodexChatRuntime {
  private readonly threadIds: CodexThreadId[]
  private readonly turns: DeterministicCodexChatTurn[]
  private readonly callLog: DeterministicCodexChatRuntimeCall[] = []
  private readonly liveThreads = new Set<CodexThreadId>()
  private readonly activeTurns = new Map<CodexThreadId, CodexTurnId>()
  private failed = false
  private closed = false

  constructor(options: DeterministicCodexChatRuntimeOptions = {}) {
    this.threadIds = [...(options.threadIds ?? [])]
    this.turns = (options.turns ?? []).map((turn) => ({
      input: { ...turn.input },
      turnId: turn.turnId,
      events: [...turn.events],
    }))
  }

  get calls(): readonly DeterministicCodexChatRuntimeCall[] {
    return [...this.callLog]
  }

  async startThread(): Promise<CodexChatThread> {
    this.callLog.push({ operation: 'startThread' })
    this.requireOpen()
    const threadId = this.threadIds.shift()
    if (threadId === undefined) {
      throw new Error('No deterministic thread identity remains')
    }
    this.liveThreads.add(threadId)
    return { threadId }
  }

  async startTurn(input: StartTurnInput): Promise<CodexChatTurn> {
    const recordedInput = { ...input }
    this.callLog.push({ operation: 'startTurn', input: recordedInput })
    this.requireOpen()
    if (!this.liveThreads.has(input.threadId)) {
      throw new Error('Deterministic turn references an unknown thread')
    }
    if (this.activeTurns.has(input.threadId)) {
      throw new Error('Deterministic thread already has an active turn')
    }
    const scripted = this.turns[0]
    if (scripted === undefined) {
      throw new Error('No deterministic turn remains')
    }
    if (
      scripted.input.threadId !== input.threadId ||
      scripted.input.text !== input.text
    ) {
      throw new Error('Deterministic turn input does not match the script')
    }
    for (const event of scripted.events) {
      if (
        event.type !== 'runtime.failed' &&
        (event.threadId !== input.threadId ||
          event.turnId !== scripted.turnId)
      ) {
        throw new Error(
          'Deterministic event identity does not match its scripted turn',
        )
      }
    }
    this.turns.shift()
    this.activeTurns.set(input.threadId, scripted.turnId)
    return {
      threadId: input.threadId,
      turnId: scripted.turnId,
      events: iterateEvents(scripted.events, (event) => {
        if (event.type === 'runtime.failed') {
          this.failRuntime()
        } else if (
          event.type === 'turn.completed' &&
          event.threadId === input.threadId &&
          event.turnId === scripted.turnId
        ) {
          this.finishTurn(input.threadId, scripted.turnId)
        }
      }),
    }
  }

  async interrupt(input: InterruptTurnInput): Promise<void> {
    const recordedInput = { ...input }
    this.callLog.push({ operation: 'interrupt', input: recordedInput })
    this.requireOpen()
    if (this.activeTurns.get(input.threadId) !== input.turnId) {
      throw new Error('Deterministic interrupt references an inactive turn')
    }
  }

  async releaseThread(input: ReleaseThreadInput): Promise<void> {
    const recordedInput = { ...input }
    this.callLog.push({ operation: 'releaseThread', input: recordedInput })
    this.requireOpen()
    if (!this.liveThreads.has(input.threadId)) {
      throw new Error('Deterministic release references an unknown thread')
    }
    if (this.activeTurns.has(input.threadId)) {
      throw new Error('Cannot release a thread with an active turn')
    }
    this.liveThreads.delete(input.threadId)
  }

  async close(): Promise<void> {
    this.callLog.push({ operation: 'close' })
    this.closed = true
  }

  private requireOpen(): void {
    if (this.failed) throw new Error('Deterministic Codex chat runtime failed')
    if (this.closed) throw new Error('Deterministic Codex chat runtime is closed')
  }

  private failRuntime(): void {
    this.failed = true
    this.activeTurns.clear()
  }

  private finishTurn(threadId: CodexThreadId, turnId: CodexTurnId): void {
    if (this.activeTurns.get(threadId) === turnId) {
      this.activeTurns.delete(threadId)
    }
  }
}

function iterateEvents(
  events: readonly CodexChatEvent[],
  onEvent: (event: CodexChatEvent) => void,
): AsyncIterable<CodexChatEvent> {
  let iteratorCreated = false
  return {
    [Symbol.asyncIterator]() {
      if (iteratorCreated) {
        throw new TypeError('A Codex turn event stream has one consumer')
      }
      iteratorCreated = true
      return iterate()
    },
  }

  async function* iterate(): AsyncGenerator<CodexChatEvent> {
    for (const event of events) {
      onEvent(event)
      yield event
    }
  }
}
