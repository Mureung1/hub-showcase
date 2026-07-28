import { EventEmitter } from 'node:events'
import { request as httpRequest, type IncomingMessage } from 'node:http'

import {
  CodexChatRuntimeError,
  type AnswerUserInput,
  type CancelUserInput,
  type CodexAccountReadiness,
  type CodexChatEvent,
  type CodexChatTurn,
  type CodexEffectiveConfig,
  type CodexEffectiveSkill,
  type CodexModelCatalog,
  type CodexProductTurn,
  type CodexWorkspaceRuntime,
  type StartProductTurnInput,
  type StartTurnInput,
} from '@ay-ple/codex-chat-runtime'

import type { CodexChatBootstrap } from '../codex-chat.js'

export const codexChatIdentity = {
  sourceCommit: '8c68d4c87dc54d38861f5114e920c3de2efa5876',
  runtimeVersion: '0.144.4',
} as const

export function configuredBootstrap(
  runtime: CodexWorkspaceRuntime,
  options: {
    readonly origin?: string
    readonly disconnectDrainMs?: number
    readonly httpWriteDrainMs?: number
  } = {},
): CodexChatBootstrap {
  return {
    ...codexChatIdentity,
    ...options,
    createRuntime: async () => runtime,
    acquireProductThread: async (actualRuntime) =>
      (await actualRuntime.startThread()).threadId,
  }
}

export async function postJson(
  url: string,
  body: unknown,
  headers: Record<string, string> = {},
): Promise<Response> {
  return fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...headers },
    body: JSON.stringify(body),
  })
}

export async function connectProductWithoutReuse(baseUrl: string): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const request = httpRequest(`${baseUrl}/api/product/bootstrap`, {
      agent: false,
    })
    request.once('response', (response) => {
      response.resume()
      resolve()
    })
    request.once('error', reject)
    request.end()
  })
}

export async function settlesBeforeImmediate(
  promise: Promise<void>,
): Promise<boolean> {
  return Promise.race([
    promise.then(
      () => true,
      () => true,
    ),
    new Promise<false>((resolve) => setImmediate(() => resolve(false))),
  ])
}

export function parseNdjson(
  encoded: string,
): Array<Record<string, unknown>> {
  return encoded
    .trim()
    .split('\n')
    .filter(Boolean)
    .map((line) => JSON.parse(line) as Record<string, unknown>)
}

export type Deferred<T> = {
  promise: Promise<T>
  resolve(value?: T): void
}

export function createDeferred<T>(): Deferred<T> {
  let resolve!: (value?: T) => void
  const promise = new Promise<T>((settle) => {
    resolve = (value) => settle(value as T)
  })
  return { promise, resolve }
}

export class ControlledRuntime implements CodexWorkspaceRuntime {
  private readonly terminalDeferred = createDeferred<CodexChatRuntimeError>()
  readonly terminal = this.terminalDeferred.promise
  private readonly eventQueue: Array<
    | { readonly type: 'event'; readonly event: CodexChatEvent }
    | { readonly type: 'error'; readonly error: Error }
  > = []
  private readonly eventWaiters: Array<
    Deferred<
      | { readonly type: 'event'; readonly event: CodexChatEvent }
      | { readonly type: 'error'; readonly error: Error }
    >
  > = []
  private readonly dispatched = createDeferred<void>()
  private readonly threadDispatched = createDeferred<void>()
  private readonly startThreadGate?: Deferred<void>
  private readonly startTurnGate?: Deferred<void>
  private readonly startThreadError?: Error
  private readonly startTurnError?: Error
  private readonly interruptError?: Error
  private readonly closeError?: Error
  private terminalError?: CodexChatRuntimeError
  startThreadCalls = 0
  startTurnCalls = 0
  releaseThreadCalls = 0
  interruptCalls = 0
  closeCalls = 0
  terminalEventsPulled = 0

  constructor(
    options: {
      holdStartThread?: boolean
      holdStartTurn?: boolean
      closeError?: Error
      interruptError?: Error
      startThreadError?: Error
      startTurnError?: Error
    } = {},
  ) {
    this.startThreadError = options.startThreadError
    this.startTurnError = options.startTurnError
    this.interruptError = options.interruptError
    this.closeError = options.closeError
    if (options.holdStartThread) this.startThreadGate = createDeferred<void>()
    if (options.holdStartTurn) this.startTurnGate = createDeferred<void>()
  }

  get turnDispatched(): Promise<void> {
    return this.dispatched.promise
  }

  get threadStartDispatched(): Promise<void> {
    return this.threadDispatched.promise
  }

  resolveStartThread(): void {
    this.startThreadGate?.resolve()
  }

  resolveStartTurn(): void {
    this.startTurnGate?.resolve()
  }

  async startThread(): Promise<{ threadId: string }> {
    this.startThreadCalls += 1
    this.threadDispatched.resolve()
    await this.startThreadGate?.promise
    if (this.startThreadError) throw this.startThreadError
    return { threadId: 'thread-A' }
  }

  async startTurn(input?: StartTurnInput): Promise<CodexChatTurn> {
    this.startTurnCalls += 1
    this.dispatched.resolve()
    await this.startTurnGate?.promise
    if (this.startTurnError) throw this.startTurnError
    return {
      threadId: input?.threadId ?? 'thread-A',
      turnId: 'turn-A1',
      events: this.events(),
    }
  }

  async readAccountReadiness(): Promise<CodexAccountReadiness> {
    throw new CodexChatRuntimeError({
      code: 'runtime_unavailable',
      displayMessage: 'The controlled test Runtime is unavailable.',
      unknownOutcome: false,
    })
  }

  async readModelCatalog(): Promise<CodexModelCatalog> {
    return { models: [] }
  }

  async readEffectiveConfig(input: {
    readonly signal: AbortSignal
  }): Promise<CodexEffectiveConfig> {
    input.signal.throwIfAborted()
    return {
      projectRootMarkers: [],
      globalInstructionsFile: null,
      mcpServers: [],
    }
  }

  async listEffectiveSkills(input: {
    readonly signal: AbortSignal
  }): Promise<readonly CodexEffectiveSkill[]> {
    input.signal.throwIfAborted()
    return []
  }

  async startProductTurn(
    input: StartProductTurnInput,
  ): Promise<CodexProductTurn> {
    return this.startTurn({
      threadId: input.threadId,
      text: input.text,
    })
  }

  async answerUserInput(_input: AnswerUserInput): Promise<void> {
    throw interactionNotPendingError()
  }

  async cancelUserInput(_input: CancelUserInput): Promise<void> {
    throw interactionNotPendingError()
  }

  async interrupt(): Promise<void> {
    this.interruptCalls += 1
    if (this.interruptError) throw this.interruptError
  }

  async releaseThread(): Promise<void> {
    this.releaseThreadCalls += 1
  }

  async close(): Promise<void> {
    this.closeCalls += 1
    if (this.closeError) {
      this.settleTerminal(
        new CodexChatRuntimeError({
          code: 'runtime_cleanup_failed',
          displayMessage:
            'The Codex runtime process tree could not be cleaned up.',
          unknownOutcome: false,
        }),
      )
      throw this.closeError
    }
    this.enqueue({
      type: 'event',
      event: {
        type: 'runtime.failed',
        code: 'runtime_closed',
        displayMessage: 'The test runtime closed.',
        mutationOutcomeKnown: true,
      },
    })
  }

  emit(event: CodexChatEvent): void {
    if (event.type === 'runtime.failed') {
      this.settleTerminal(
        new CodexChatRuntimeError({
          code: event.code,
          displayMessage: event.displayMessage,
          unknownOutcome: false,
        }),
      )
    }
    this.enqueue({ type: 'event', event })
  }

  failRuntime(error: CodexChatRuntimeError): void {
    if (!this.settleTerminal(error)) return
    this.enqueue({
      type: 'event',
      event: {
        type: 'runtime.failed',
        code: error.code,
        displayMessage: error.displayMessage,
        mutationOutcomeKnown: true,
      },
    })
  }

  failStream(error: Error): void {
    this.enqueue({ type: 'error', error })
  }

  private async *events(): AsyncGenerator<CodexChatEvent> {
    while (true) {
      const entry = await this.nextEvent()
      if (entry.type === 'error') throw entry.error
      const event = entry.event
      if (event.type === 'turn.completed' || event.type === 'runtime.failed') {
        this.terminalEventsPulled += 1
      }
      yield event
      if (event.type === 'turn.completed' || event.type === 'runtime.failed') {
        return
      }
    }
  }

  private enqueue(entry: (typeof this.eventQueue)[number]): void {
    const waiter = this.eventWaiters.shift()
    if (waiter) {
      waiter.resolve(entry)
      return
    }
    this.eventQueue.push(entry)
  }

  private settleTerminal(error: CodexChatRuntimeError): boolean {
    if (this.terminalError) return false
    this.terminalError = error
    this.terminalDeferred.resolve(error)
    return true
  }

  private nextEvent(): Promise<(typeof this.eventQueue)[number]> {
    const entry = this.eventQueue.shift()
    if (entry) return Promise.resolve(entry)
    const waiter = createDeferred<(typeof this.eventQueue)[number]>()
    this.eventWaiters.push(waiter)
    return waiter.promise
  }
}

function interactionNotPendingError(): CodexChatRuntimeError {
  return new CodexChatRuntimeError({
    code: 'interaction_not_pending',
    displayMessage: 'The user-input interaction is not pending.',
    unknownOutcome: false,
  })
}

export class BackpressuredResponse extends EventEmitter {
  destroyed = false
  readonly writableEnded = false
  destroyCalls = 0

  write(_chunk: string): boolean {
    return false
  }

  destroy(): void {
    this.destroyCalls += 1
    this.destroyed = true
    this.emit('close')
  }
}

export function abortablePost(
  url: string,
  body: unknown,
): { readonly closed: Promise<void>; destroy(): void } {
  const target = new URL(url)
  const closed = createDeferred<void>()
  let socket: import('node:net').Socket | undefined
  const request = httpRequest({
    hostname: target.hostname,
    port: target.port,
    path: target.pathname,
    method: 'POST',
    headers: { 'content-type': 'application/json' },
  })
  request.on('error', () => undefined)
  request.on('socket', (assigned) => {
    socket = assigned
    assigned.once('close', () => closed.resolve())
  })
  request.end(JSON.stringify(body))
  return {
    closed: closed.promise,
    destroy: () => (socket ? socket.destroy() : request.destroy()),
  }
}

export function postUntilFirstLine(
  url: string,
  body: unknown,
): {
  readonly firstLine: Promise<string>
  readonly closed: Promise<void>
  destroy(): void
} {
  const target = new URL(url)
  const firstLine = createDeferred<string>()
  const closed = createDeferred<void>()
  let response: IncomingMessage | undefined
  let encoded = ''
  const request = httpRequest({
    hostname: target.hostname,
    port: target.port,
    path: target.pathname,
    method: 'POST',
    headers: { 'content-type': 'application/json' },
  })
  request.on('error', () => undefined)
  request.on('response', (incoming) => {
    response = incoming
    incoming.setEncoding('utf8')
    incoming.on('data', (chunk: string) => {
      encoded += chunk
      const newline = encoded.indexOf('\n')
      if (newline >= 0) firstLine.resolve(encoded.slice(0, newline))
    })
    incoming.once('close', () => closed.resolve())
  })
  request.end(JSON.stringify(body))
  return {
    firstLine: firstLine.promise,
    closed: closed.promise,
    destroy() {
      if (response) response.destroy()
      else request.destroy()
    },
  }
}

export async function waitFor(
  predicate: () => boolean,
  timeoutMs = 1_000,
): Promise<void> {
  const deadline = Date.now() + timeoutMs
  while (!predicate()) {
    if (Date.now() >= deadline) {
      throw new Error('Timed out waiting for test state')
    }
    await new Promise((resolve) => setTimeout(resolve, 5))
  }
}
