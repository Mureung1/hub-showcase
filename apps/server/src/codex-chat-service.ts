import {
  CODEX_CHAT_APPROVAL_MODE,
  CODEX_CHAT_SANDBOX,
  CodexChatRuntimeError,
  type CodexChatEvent,
  type CodexChatRuntime,
  type CodexChatRuntimeEvidence,
  type CodexChatStatus,
  type CodexChatStreamFrame,
  type CodexChatTurn,
} from '@ay-ple/codex-chat-runtime'

import type {
  CodexChatPreparedRuntime,
  CodexChatRuntimeSource,
  CodexChatUnavailableReason,
} from './codex-chat-config.js'

const SAFE_STREAM_FAILED_MESSAGE = 'The Codex Chat stream failed.'

type ActiveTurn = {
  readonly threadId: string
  phase: 'starting' | 'streaming'
  turn?: CodexChatTurn
  disconnected: boolean
  interruptRequested: boolean
  drainDeadline?: NodeJS.Timeout
}

export type CodexChatServiceErrorCode =
  | 'active_turn'
  | 'codex_chat_unavailable'
  | 'unknown_thread'
  | 'unknown_turn'

export class CodexChatServiceError extends Error {
  readonly code: CodexChatServiceErrorCode

  constructor(code: CodexChatServiceErrorCode) {
    super(code)
    this.code = code
  }
}

export interface CodexChatStreamSink {
  accept(turn: CodexChatTurn): Promise<boolean>
  write(frame: CodexChatStreamFrame): Promise<boolean>
  end(): void
}

export class CodexChatService {
  private readonly source: CodexChatRuntimeSource
  private readonly disconnectDrainMs: number
  private preparation?: Promise<void>
  private prepared?: CodexChatPreparedRuntime
  private unavailableReason?: CodexChatUnavailableReason
  private runtime?: CodexChatRuntime
  private runtimePromise?: Promise<CodexChatRuntime>
  private observedRuntime?: CodexChatRuntime
  private runtimeClosePromise?: Promise<void>
  private runtimeFailureCode?: string
  private currentThreadId?: string
  private threadStarting = false
  private activeTurn?: ActiveTurn
  private shuttingDown = false
  private closePromise?: Promise<void>

  constructor(source: CodexChatRuntimeSource, disconnectDrainMs: number) {
    this.source = source
    this.disconnectDrainMs = disconnectDrainMs
    if (source.kind === 'prepared') this.prepared = source.prepared
    if (source.kind === 'unavailable') this.unavailableReason = source.reason
  }

  async status(): Promise<CodexChatStatus> {
    await this.ensurePrepared()
    if (this.unavailableReason) return unavailableStatus(this.unavailableReason)
    const evidence = this.evidence()
    if (this.runtimeFailureCode) {
      return policyStatus({
        state: 'failed',
        ...evidence,
        failureCode: this.runtimeFailureCode,
      })
    }
    return policyStatus({
      state: this.runtime ? 'ready' : this.runtimePromise ? 'starting' : 'configured',
      ...evidence,
    })
  }

  beginShutdown(): void {
    this.shuttingDown = true
  }

  close(): Promise<void> {
    this.beginShutdown()
    this.closePromise ??= this.closeOnce()
    return this.closePromise
  }

  async startThread(
    disconnected: () => boolean,
  ): Promise<{ readonly threadId: string } | undefined> {
    this.requireAvailable()
    if (this.threadStarting || this.activeTurn) throw stateError('active_turn')
    this.threadStarting = true
    try {
      const runtime = await this.getRuntime()
      if (disconnected()) return undefined
      if (this.currentThreadId) {
        await runtime.releaseThread({ threadId: this.currentThreadId })
        this.currentThreadId = undefined
      }
      if (disconnected()) return undefined
      let thread
      try {
        thread = await runtime.startThread()
      } catch (error) {
        await this.handleUnknownOutcome(error)
        throw error
      }
      if (disconnected()) {
        try {
          await runtime.releaseThread({ threadId: thread.threadId })
        } catch {
          await this.failAndClose('thread_release_failed')
        }
        return undefined
      }
      this.currentThreadId = thread.threadId
      return thread
    } finally {
      this.threadStarting = false
    }
  }

  async abandonThread(threadId: string): Promise<void> {
    if (this.currentThreadId !== threadId || this.activeTurn) return
    this.currentThreadId = undefined
    const runtime = this.runtime
    if (!runtime) {
      await this.failAndClose('runtime_state_invalid')
      return
    }
    try {
      await runtime.releaseThread({ threadId })
    } catch {
      await this.failAndClose('thread_release_failed')
    }
  }

  async startTurn(
    threadId: string,
    text: string,
    disconnected: () => boolean,
  ): Promise<CodexChatTurn | undefined> {
    this.requireAvailable()
    if (this.currentThreadId !== threadId) throw stateError('unknown_thread')
    if (this.threadStarting || this.activeTurn) throw stateError('active_turn')
    const reservation: ActiveTurn = {
      threadId,
      phase: 'starting',
      disconnected: disconnected(),
      interruptRequested: false,
    }
    this.activeTurn = reservation
    try {
      const runtime = await this.getRuntime()
      if (reservation.disconnected || disconnected()) {
        if (this.activeTurn === reservation) this.activeTurn = undefined
        return undefined
      }
      const turn = await runtime.startTurn({ threadId, text })
      reservation.phase = 'streaming'
      reservation.turn = turn
      if (reservation.disconnected || disconnected()) {
        reservation.disconnected = true
        this.beginDisconnectCleanup(reservation)
      }
      return turn
    } catch (error) {
      if (this.activeTurn === reservation) this.activeTurn = undefined
      await this.handleUnknownOutcome(error)
      throw error
    }
  }

  async streamTurn(
    turn: CodexChatTurn,
    sink: CodexChatStreamSink | undefined,
  ): Promise<void> {
    const active = this.activeTurn
    if (!active || active.turn !== turn) throw stateError('unknown_turn')
    let terminalSeen = false
    let runtimeFailed = false
    try {
      if (sink) {
        const accepted = await safelyWrite(() => sink?.accept(turn))
        if (!accepted) {
          active.disconnected = true
          this.beginDisconnectCleanup(active)
          sink = undefined
        }
      }
      for await (const event of turn.events) {
        if (isTerminalEvent(event)) terminalSeen = true
        if (event.type === 'runtime.failed') {
          runtimeFailed = true
          this.latchRuntimeFailure(event.code)
        }
        if (sink) {
          const written = await safelyWrite(() => sink?.write(event))
          if (!written) {
            active.disconnected = true
            this.beginDisconnectCleanup(active)
            sink = undefined
          }
        }
        if (terminalSeen) break
      }
      if (!terminalSeen) {
        await this.emitPostAcceptanceFailure(sink, 'runtime_stream_ended')
      }
    } catch (error) {
      const code =
        error instanceof CodexChatRuntimeError
          ? safeFailureCode(error.code)
          : 'runtime_stream_failed'
      await this.emitPostAcceptanceFailure(sink, code)
    } finally {
      this.finishTurn(active)
      if (runtimeFailed) await this.settleAutonomousClose()
      sink?.end()
    }
  }

  disconnectTurn(threadId: string): void {
    const active = this.activeTurn
    if (!active || active.threadId !== threadId) return
    active.disconnected = true
    if (active.phase === 'streaming') this.beginDisconnectCleanup(active)
  }

  async interrupt(threadId: string, turnId: string): Promise<void> {
    this.requireAvailable()
    const active = this.activeTurn
    if (
      !active ||
      active.phase !== 'streaming' ||
      active.threadId !== threadId ||
      active.turn?.turnId !== turnId
    ) {
      throw stateError('unknown_turn')
    }
    active.interruptRequested = true
    const runtime = this.runtime
    if (!runtime) throw stateError('codex_chat_unavailable')
    try {
      await runtime.interrupt({ threadId, turnId })
    } catch (error) {
      await this.handleUnknownOutcome(error)
      throw error
    }
  }

  private async ensurePrepared(): Promise<void> {
    if (this.prepared || this.unavailableReason || this.source.kind !== 'candidate') {
      return
    }
    this.preparation ??= this.prepareCandidate(this.source)
    await this.preparation
  }

  private async prepareCandidate(
    source: Extract<CodexChatRuntimeSource, { kind: 'candidate' }>,
  ): Promise<void> {
    const result = await source.prepare()
    if (result.kind === 'prepared') {
      this.prepared = result.prepared
      return
    }
    this.unavailableReason = result.reason
  }

  private async getRuntime(): Promise<CodexChatRuntime> {
    this.requireAvailable()
    await this.ensurePrepared()
    this.requireAvailable()
    if (this.runtime) return this.runtime
    if (this.runtimeFailureCode) throw stateError('codex_chat_unavailable')
    const prepared = this.prepared
    if (!prepared) throw stateError('codex_chat_unavailable')
    this.runtimePromise ??= prepared.createRuntime()
    try {
      this.runtime = await this.runtimePromise
      this.observeRuntime(this.runtime)
      if (this.shuttingDown) {
        await this.closeRuntime()
        throw stateError('codex_chat_unavailable')
      }
      return this.runtime
    } catch (error) {
      if (!(error instanceof CodexChatServiceError)) {
        this.latchRuntimeFailure(
          error instanceof CodexChatRuntimeError
            ? error.code
            : 'runtime_start_failed',
        )
      }
      throw error
    }
  }

  private requireAvailable(): void {
    if (this.shuttingDown || this.unavailableReason || this.runtimeFailureCode) {
      throw stateError('codex_chat_unavailable')
    }
  }

  private evidence(): CodexChatRuntimeEvidence {
    if (!this.prepared) throw new TypeError('Codex Chat evidence is unavailable')
    return {
      sourceCommit: this.prepared.sourceCommit,
      runtimeVersion: this.prepared.runtimeVersion,
    }
  }

  private beginDisconnectCleanup(active: ActiveTurn): void {
    if (!active.turn || this.activeTurn !== active) return
    if (!active.interruptRequested) {
      active.interruptRequested = true
      const runtime = this.runtime
      if (!runtime) {
        void this.failAndClose('runtime_state_invalid')
      } else {
        void runtime
          .interrupt({
            threadId: active.threadId,
            turnId: active.turn.turnId,
          })
          .catch((error: unknown) => this.handleUnknownOutcome(error))
      }
    }
    if (!active.drainDeadline) {
      active.drainDeadline = setTimeout(() => {
        if (this.activeTurn === active) {
          void this.failAndClose('disconnect_drain_timeout')
        }
      }, this.disconnectDrainMs)
    }
  }

  private finishTurn(active: ActiveTurn): void {
    if (active.drainDeadline) clearTimeout(active.drainDeadline)
    if (this.activeTurn === active) this.activeTurn = undefined
  }

  private async emitPostAcceptanceFailure(
    sink: CodexChatStreamSink | undefined,
    failureCode: string,
  ): Promise<void> {
    this.latchRuntimeFailure(failureCode)
    if (sink) {
      await safelyWrite(() =>
        sink?.write({
          type: 'runtime.failed',
          code: this.runtimeFailureCode ?? 'runtime_failed',
          displayMessage: SAFE_STREAM_FAILED_MESSAGE,
          mutationOutcomeKnown: true,
        }),
      )
    }
    await this.settleAutonomousClose()
  }

  private async handleUnknownOutcome(error: unknown): Promise<void> {
    if (error instanceof CodexChatRuntimeError && error.unknownOutcome) {
      await this.failAndClose(error.code)
    }
  }

  private async failAndClose(code: string): Promise<void> {
    this.latchRuntimeFailure(code)
    await this.settleAutonomousClose()
  }

  private observeRuntime(runtime: CodexChatRuntime): void {
    if (this.observedRuntime === runtime) return
    this.observedRuntime = runtime
    void runtime.terminal.then((error) =>
      this.handleRuntimeTerminal(runtime, error),
    )
  }

  private async handleRuntimeTerminal(
    runtime: CodexChatRuntime,
    error: CodexChatRuntimeError,
  ): Promise<void> {
    if (this.runtime !== runtime) return
    this.latchRuntimeFailure(error.code)
    await this.settleAutonomousClose()
  }

  private latchRuntimeFailure(code: string): void {
    this.runtimeFailureCode ??= safeFailureCode(code)
  }

  private async settleAutonomousClose(): Promise<void> {
    try {
      await this.closeRuntime()
    } catch {
      this.runtimeFailureCode = 'runtime_cleanup_failed'
    }
  }

  private closeRuntime(): Promise<void> {
    this.runtimeClosePromise ??= this.closeRuntimeOnce()
    return this.runtimeClosePromise
  }

  private async closeRuntimeOnce(): Promise<void> {
    let runtime = this.runtime
    if (!runtime && this.runtimePromise) {
      runtime = await this.runtimePromise.catch(() => undefined)
    }
    if (runtime) await runtime.close()
  }

  private async closeOnce(): Promise<void> {
    if (this.activeTurn) this.disconnectTurn(this.activeTurn.threadId)
    await this.closeRuntime()
  }
}

function unavailableStatus(
  reason: CodexChatUnavailableReason,
): CodexChatStatus {
  return policyStatus({ state: 'unavailable', reason })
}

function policyStatus<T extends object>(status: T): T & {
  readonly approvalMode: typeof CODEX_CHAT_APPROVAL_MODE
  readonly sandbox: typeof CODEX_CHAT_SANDBOX
} {
  return {
    ...status,
    approvalMode: CODEX_CHAT_APPROVAL_MODE,
    sandbox: CODEX_CHAT_SANDBOX,
  }
}

function stateError(code: CodexChatServiceErrorCode): CodexChatServiceError {
  return new CodexChatServiceError(code)
}

function safeFailureCode(code: string): string {
  return /^[a-z][a-z0-9_]{0,63}$/.test(code) ? code : 'runtime_failed'
}

function isTerminalEvent(event: CodexChatEvent): boolean {
  return event.type === 'turn.completed' || event.type === 'runtime.failed'
}

async function safelyWrite(
  write: () => Promise<boolean> | undefined,
): Promise<boolean> {
  try {
    return (await write()) ?? false
  } catch {
    return false
  }
}
