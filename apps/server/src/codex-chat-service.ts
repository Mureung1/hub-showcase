import {
  CodexChatRuntimeError,
  type AnswerUserInput,
  type CancelUserInput,
  type CodexAccountReadiness,
  type CodexModelCatalog,
  type CodexProductActivity,
  type CodexProductTurn,
  type CodexWorkspaceRuntime,
  type StartProductTurnInput,
} from '@ay-ple/codex-chat-runtime'

import type {
  CodexChatPreparedRuntime,
  CodexChatRuntimeSource,
  CodexChatUnavailableReason,
} from './codex-chat-config.js'

type ActiveTurn = {
  threadId: string
  phase: 'starting' | 'streaming'
  turn?: CodexProductTurn
  disconnected: boolean
  interruptRequested: boolean
  drainDeadline?: NodeJS.Timeout
}

export type ProductThreadProfile = {
  readonly workspace: string
  readonly mcp: {
    readonly url: string
    readonly token: string
  }
}

export type ProductTurnInput = Omit<StartProductTurnInput, 'threadId'> & {
  readonly profile?: ProductThreadProfile
}

export type ProductOperationLease = {
  readonly operationId: string
}

export type ProductTurnSettlement =
  | {
      readonly type: 'terminal'
      readonly event: Extract<CodexProductActivity, { type: 'turn.completed' }>
    }
  | {
      readonly type: 'unknown'
      readonly code: string
    }

export interface CodexProductStreamSink {
  accept(turn: CodexProductTurn): Promise<boolean>
  write(activity: CodexProductActivity): Promise<boolean>
  end(): void
}

export type CodexChatServiceErrorCode =
  | 'active_turn'
  | 'codex_chat_unavailable'
  | 'unknown_turn'

export class CodexChatServiceError extends Error {
  readonly code: CodexChatServiceErrorCode

  constructor(code: CodexChatServiceErrorCode) {
    super(code)
    this.code = code
  }
}

export class CodexChatService {
  private readonly source: CodexChatRuntimeSource
  private readonly disconnectDrainMs: number
  private preparation?: Promise<void>
  private prepared?: CodexChatPreparedRuntime
  private unavailableReason?: CodexChatUnavailableReason
  private runtime?: CodexWorkspaceRuntime
  private runtimePromise?: Promise<CodexWorkspaceRuntime>
  private observedRuntime?: CodexWorkspaceRuntime
  private runtimeClosePromise?: Promise<void>
  private runtimeRecyclePromise?: Promise<void>
  private runtimeFailureCode?: string
  private currentThreadId?: string
  private currentThreadProfile?: string
  private accountReadPromise?: Promise<CodexAccountReadiness>
  private modelCatalogReadPromise?: Promise<CodexModelCatalog>
  private activeTurn?: ActiveTurn
  private productOperationLease?: ProductOperationLease
  private shuttingDown = false
  private closePromise?: Promise<void>

  constructor(source: CodexChatRuntimeSource, disconnectDrainMs: number) {
    this.source = source
    this.disconnectDrainMs = disconnectDrainMs
    if (source.kind === 'prepared') this.prepared = source.prepared
    if (source.kind === 'unavailable') this.unavailableReason = source.reason
  }

  beginShutdown(): void {
    this.shuttingDown = true
  }

  close(): Promise<void> {
    this.beginShutdown()
    this.closePromise ??= this.closeOnce()
    return this.closePromise
  }

  reserveProductOperation(operationId: string): ProductOperationLease {
    this.requireAvailable()
    if (
      this.accountReadPromise ||
      this.modelCatalogReadPromise ||
      this.activeTurn ||
      this.productOperationLease
    ) {
      throw stateError('active_turn')
    }
    const lease = { operationId }
    this.productOperationLease = lease
    this.activeTurn = {
      threadId: '',
      phase: 'starting',
      disconnected: false,
      interruptRequested: false,
    }
    return lease
  }

  async releaseProductOperation(
    lease: ProductOperationLease,
    options: { readonly recycleRuntime: boolean } = {
      recycleRuntime: false,
    },
  ): Promise<void> {
    if (this.productOperationLease !== lease) return
    const active = this.activeTurn
    if (active?.turn === undefined) {
      this.activeTurn = undefined
    }
    try {
      if (options.recycleRuntime) await this.recycleProductRuntime()
    } finally {
      if (this.productOperationLease === lease) {
        this.productOperationLease = undefined
      }
    }
  }

  async readProductAccountReadiness(
    lease?: ProductOperationLease,
  ): Promise<CodexAccountReadiness> {
    this.requireAvailable()
    if (lease) {
      this.requireProductLease(lease)
      return this.readProductAccountReadinessOnce()
    }

    if (this.activeTurn || this.productOperationLease) {
      throw stateError('active_turn')
    }
    if (this.accountReadPromise) return this.accountReadPromise

    const read = this.readProductAccountReadinessOnce()
    this.accountReadPromise = read
    void read.then(
      () => this.clearAccountRead(read),
      () => this.clearAccountRead(read),
    )
    return read
  }

  async readProductModelCatalog(
    lease?: ProductOperationLease,
  ): Promise<CodexModelCatalog> {
    this.requireAvailable()
    if (lease) {
      this.requireProductLease(lease)
      return this.readProductModelCatalogOnce()
    }
    if (this.activeTurn || this.productOperationLease) {
      throw stateError('active_turn')
    }
    if (this.modelCatalogReadPromise) return this.modelCatalogReadPromise
    const read = this.readProductModelCatalogOnce()
    this.modelCatalogReadPromise = read
    void read.then(
      () => this.clearModelCatalogRead(read),
      () => this.clearModelCatalogRead(read),
    )
    return read
  }

  async startProductTurn(
    input: ProductTurnInput,
    disconnected: () => boolean,
    lease?: ProductOperationLease,
  ): Promise<CodexProductTurn | undefined> {
    this.requireAvailable()
    let reservation: ActiveTurn
    if (lease) {
      this.requireProductLease(lease)
      reservation = this.activeTurn as ActiveTurn
      reservation.disconnected = disconnected()
    } else {
      if (
        this.accountReadPromise ||
        this.modelCatalogReadPromise ||
        this.activeTurn ||
        this.productOperationLease
      ) {
        throw stateError('active_turn')
      }
      reservation = {
        threadId: '',
        phase: 'starting',
        disconnected: disconnected(),
        interruptRequested: false,
      }
      this.activeTurn = reservation
    }
    try {
      const runtime = await this.getRuntime()
      if (reservation.disconnected || disconnected()) {
        this.finishTurn(reservation)
        return undefined
      }
      const threadId = await this.ensureProductThread(runtime, input.profile)
      reservation.threadId = threadId
      if (reservation.disconnected || disconnected()) {
        this.finishTurn(reservation)
        return undefined
      }
      const turn = await runtime.startProductTurn({
        threadId,
        ...(input.skill === undefined ? {} : { skill: input.skill }),
        permissionProfile: input.permissionProfile,
        ...(input.settings === undefined ? {} : { settings: input.settings }),
        text: input.text,
      })
      reservation.phase = 'streaming'
      reservation.turn = turn
      if (reservation.disconnected || disconnected()) {
        reservation.disconnected = true
        this.beginDisconnectCleanup(reservation)
      }
      return turn
    } catch (error) {
      this.finishTurn(reservation)
      await this.handleUnknownOutcome(error)
      throw error
    }
  }

  async streamProductTurn(
    turn: CodexProductTurn,
    sink: CodexProductStreamSink | undefined,
  ): Promise<ProductTurnSettlement> {
    const active = this.activeTurn
    if (
      !active ||
      active.turn !== turn
    ) {
      throw stateError('unknown_turn')
    }
    let settlement: ProductTurnSettlement | undefined
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
      for await (const activity of turn.events) {
        if (activity.type === 'turn.completed') {
          settlement = { type: 'terminal', event: activity }
        } else if (activity.type === 'runtime.failed') {
          runtimeFailed = true
          this.latchRuntimeFailure(activity.code)
          settlement = {
            type: 'unknown',
            code: this.runtimeFailureCode ?? 'runtime_failed',
          }
        }
        if (sink) {
          const written = await safelyWrite(() => sink?.write(activity))
          if (!written) {
            active.disconnected = true
            this.beginDisconnectCleanup(active)
            sink = undefined
          }
        }
        if (settlement) break
      }
      if (!settlement) {
        this.latchRuntimeFailure('runtime_stream_ended')
        runtimeFailed = true
        settlement = {
          type: 'unknown',
          code: this.runtimeFailureCode ?? 'runtime_stream_ended',
        }
      }
    } catch (error) {
      const code =
        error instanceof CodexChatRuntimeError
          ? safeFailureCode(error.code)
          : 'runtime_stream_failed'
      this.latchRuntimeFailure(code)
      runtimeFailed = true
      settlement = {
        type: 'unknown',
        code: this.runtimeFailureCode ?? code,
      }
    } finally {
      this.finishTurn(active)
      if (runtimeFailed) await this.settleAutonomousClose()
    }
    return settlement
  }

  disconnectProductTurn(turn: CodexProductTurn): void {
    const active = this.activeTurn
    if (active?.turn !== turn) return
    this.disconnectActiveTurn(active)
  }

  async answerProductUserInput(input: AnswerUserInput): Promise<void> {
    const runtime = this.requireStartedRuntime()
    try {
      await runtime.answerUserInput(input)
    } catch (error) {
      await this.handleUnknownOutcome(error)
      throw error
    }
  }

  async cancelProductUserInput(input: CancelUserInput): Promise<void> {
    const runtime = this.requireStartedRuntime()
    try {
      await runtime.cancelUserInput(input)
    } catch (error) {
      await this.handleUnknownOutcome(error)
      throw error
    }
  }

  interruptProductTurn(turn: CodexProductTurn): Promise<void> {
    return this.interruptActiveTurn(turn.threadId, turn.turnId)
  }

  async abandonAcceptedProductTurn(
    turn: CodexProductTurn,
    code: string,
  ): Promise<void> {
    const active = this.activeTurn
    if (active?.turn === turn) {
      try {
        await this.runtime?.interrupt({
          threadId: turn.threadId,
          turnId: turn.turnId,
        })
      } catch {
        // Closing the Runtime is the authoritative fallback for this unknown start.
      }
      this.finishTurn(active)
    }
    this.latchRuntimeFailure(code)
    await this.recycleProductRuntime()
  }

  async recycleProductRuntime(): Promise<void> {
    if (this.runtimeRecyclePromise) return this.runtimeRecyclePromise
    if (this.accountReadPromise || this.modelCatalogReadPromise || this.activeTurn) {
      throw stateError('active_turn')
    }
    const recycling = this.recycleProductRuntimeOnce()
    this.runtimeRecyclePromise = recycling
    try {
      await recycling
    } finally {
      if (this.runtimeRecyclePromise === recycling) {
        this.runtimeRecyclePromise = undefined
      }
    }
  }

  private disconnectActiveTurn(active: ActiveTurn): void {
    if (this.activeTurn !== active) return
    active.disconnected = true
    if (active.phase === 'streaming') this.beginDisconnectCleanup(active)
  }

  private async readProductAccountReadinessOnce(): Promise<CodexAccountReadiness> {
    try {
      const runtime = await this.getRuntime()
      return await runtime.readAccountReadiness()
    } catch (error) {
      await this.handleUnknownOutcome(error)
      throw error
    }
  }

  private clearAccountRead(read: Promise<CodexAccountReadiness>): void {
    if (this.accountReadPromise === read) {
      this.accountReadPromise = undefined
    }
  }

  private async readProductModelCatalogOnce(): Promise<CodexModelCatalog> {
    try {
      const runtime = await this.getRuntime()
      return await runtime.readModelCatalog()
    } catch (error) {
      await this.handleUnknownOutcome(error)
      throw error
    }
  }

  private clearModelCatalogRead(read: Promise<CodexModelCatalog>): void {
    if (this.modelCatalogReadPromise === read) {
      this.modelCatalogReadPromise = undefined
    }
  }

  private async interruptActiveTurn(
    threadId: string,
    turnId: string,
  ): Promise<void> {
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

  private async getRuntime(): Promise<CodexWorkspaceRuntime> {
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

  private async ensureProductThread(
    runtime: CodexWorkspaceRuntime,
    profile?: ProductThreadProfile,
  ): Promise<string> {
    const profileKey = profile ? productThreadProfileKey(profile) : 'project'
    if (this.currentThreadId && this.currentThreadProfile === profileKey) {
      return this.currentThreadId
    }
    if (this.currentThreadId) {
      await runtime.releaseThread({ threadId: this.currentThreadId })
      this.currentThreadId = undefined
      this.currentThreadProfile = undefined
    }
    let thread
    try {
      thread = profile
        ? await runtime.startThread({
            workspace: profile.workspace,
            mcp: profile.mcp,
          })
        : await runtime.startThread()
    } catch (error) {
      await this.handleUnknownOutcome(error)
      throw error
    }
    this.currentThreadId = thread.threadId
    this.currentThreadProfile = profileKey
    return thread.threadId
  }

  private requireStartedRuntime(): CodexWorkspaceRuntime {
    this.requireAvailable()
    if (!this.runtime) throw stateError('codex_chat_unavailable')
    return this.runtime
  }

  private requireProductLease(lease: ProductOperationLease): void {
    if (
      this.productOperationLease !== lease ||
      !this.activeTurn ||
      this.activeTurn.turn !== undefined
    ) {
      throw stateError('active_turn')
    }
  }

  private requireAvailable(): void {
    if (
      this.shuttingDown ||
      this.unavailableReason ||
      this.runtimeFailureCode ||
      this.runtimeRecyclePromise
    ) {
      throw stateError('codex_chat_unavailable')
    }
  }

  private async recycleProductRuntimeOnce(): Promise<void> {
    try {
      await this.closeRuntime()
    } catch {
      this.runtimeFailureCode = 'runtime_cleanup_failed'
      throw stateError('codex_chat_unavailable')
    }
    this.runtime = undefined
    this.runtimePromise = undefined
    this.observedRuntime = undefined
    this.runtimeClosePromise = undefined
    this.runtimeFailureCode = undefined
    this.currentThreadId = undefined
    this.currentThreadProfile = undefined
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
    if (this.activeTurn === active) {
      this.activeTurn = undefined
    }
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

  private observeRuntime(runtime: CodexWorkspaceRuntime): void {
    if (this.observedRuntime === runtime) return
    this.observedRuntime = runtime
    void runtime.terminal.then((error) =>
      this.handleRuntimeTerminal(runtime, error),
    )
  }

  private async handleRuntimeTerminal(
    runtime: CodexWorkspaceRuntime,
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
    if (this.activeTurn) this.disconnectActiveTurn(this.activeTurn)
    await this.closeRuntime()
  }
}

function stateError(code: CodexChatServiceErrorCode): CodexChatServiceError {
  return new CodexChatServiceError(code)
}

function safeFailureCode(code: string): string {
  return /^[a-z][a-z0-9_]{0,63}$/.test(code) ? code : 'runtime_failed'
}

function productThreadProfileKey(profile: ProductThreadProfile): string {
  return `${profile.workspace}\u0000${profile.mcp.url}`
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
