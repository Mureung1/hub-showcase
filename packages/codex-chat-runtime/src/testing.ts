import type {
  CodexAccountReadiness,
  CodexChatEvent,
  CodexChatThread,
  CodexChatTurn,
  CodexInteractionId,
  CodexProductActivity,
  CodexThreadId,
  CodexTurnId,
  InterruptTurnInput,
  ReleaseThreadInput,
  StartTurnInput,
} from './contract.js'
import type {
  AnswerUserInput,
  CancelUserInput,
  CodexModelCatalog,
  CodexProductTurn,
  CodexWorkspaceRuntime,
  StartProductTurnInput,
} from './runtime-contract.js'
import type {
  CodexEffectiveConfig,
  CodexEffectiveSkill,
} from './native-context-contract.js'
import {
  CodexChatRuntimeError,
  INTERACTION_NOT_PENDING_MESSAGE,
} from './errors.js'

export {
  startCodexChatProcessTreeTestFixture,
  type CodexChatProcessTreeTestFixture,
  type CodexChatTestProcessTree,
} from './testing-process-tree.js'
export {
  startCodexActionLocalProviderTestFixture,
  type CodexActionLocalProviderFunctionCall,
  type CodexActionLocalProviderJournal,
  type CodexActionLocalProviderTestFixture,
} from './testing-action-local-provider.js'

export type DeterministicCodexChatRuntimeCall =
  | { readonly operation: 'readAccountReadiness' }
  | { readonly operation: 'readModelCatalog' }
  | { readonly operation: 'readEffectiveConfig' }
  | { readonly operation: 'listEffectiveSkills' }
  | { readonly operation: 'startThread' }
  | {
      readonly operation: 'startTurn'
      readonly input: StartTurnInput
    }
  | {
      readonly operation: 'startProductTurn'
      readonly input: StartProductTurnInput
    }
  | {
      readonly operation: 'answerUserInput'
      readonly input: AnswerUserInput
    }
  | {
      readonly operation: 'cancelUserInput'
      readonly input: CancelUserInput
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

function interactionNotPendingError(): CodexChatRuntimeError {
  return new CodexChatRuntimeError({
    code: 'interaction_not_pending',
    displayMessage: INTERACTION_NOT_PENDING_MESSAGE,
    unknownOutcome: false,
  })
}

export type DeterministicCodexChatTurn = {
  readonly input: StartTurnInput
  readonly turnId: CodexTurnId
  readonly events: readonly CodexChatEvent[]
}

export type DeterministicCodexProductTurn = {
  readonly input: StartProductTurnInput
  readonly turnId: CodexTurnId
  readonly events: readonly CodexProductActivity[]
}

export type DeterministicCodexChatRuntimeOptions = {
  readonly accountReadiness?: readonly CodexAccountReadiness[]
  readonly modelCatalogs?: readonly CodexModelCatalog[]
  readonly effectiveConfigs?: readonly DeterministicValue<CodexEffectiveConfig>[]
  readonly effectiveSkills?: readonly DeterministicValue<
    readonly CodexEffectiveSkill[]
  >[]
  readonly threadIds?: readonly CodexThreadId[]
  readonly productTurns?: readonly DeterministicCodexProductTurn[]
  readonly turns?: readonly DeterministicCodexChatTurn[]
}

type DeterministicValue<T> = T | PromiseLike<T>

export type DeterministicCodexProductRuntimeCall =
  DeterministicCodexChatRuntimeCall
export type DeterministicCodexProductRuntimeOptions =
  DeterministicCodexChatRuntimeOptions

type DeterministicInteractionResolution =
  | 'answered'
  | 'cancelled'

type DeterministicPendingInteraction = {
  readonly threadId: CodexThreadId
  readonly turnId: CodexTurnId
  readonly settlement: ReturnType<
    typeof createDeferred<DeterministicInteractionResolution>
  >
  readonly acknowledgement: ReturnType<typeof createDeferred<void>>
  settled: boolean
}

export class DeterministicCodexChatRuntime implements CodexWorkspaceRuntime {
  private readonly terminalDeferred = createDeferred<CodexChatRuntimeError>()
  readonly terminal = this.terminalDeferred.promise
  private readonly accountReadiness: CodexAccountReadiness[]
  private readonly modelCatalogs: CodexModelCatalog[]
  private readonly effectiveConfigs: DeterministicValue<CodexEffectiveConfig>[]
  private readonly effectiveSkills: DeterministicValue<
    readonly CodexEffectiveSkill[]
  >[]
  private readonly threadIds: CodexThreadId[]
  private readonly productTurns: DeterministicCodexProductTurn[]
  private readonly turns: DeterministicCodexChatTurn[]
  private readonly callLog: DeterministicCodexChatRuntimeCall[] = []
  private readonly liveThreads = new Set<CodexThreadId>()
  private readonly activeTurns = new Map<CodexThreadId, CodexTurnId>()
  private readonly pendingInteractions = new Map<
    CodexInteractionId,
    DeterministicPendingInteraction
  >()
  private failed = false
  private closed = false

  constructor(options: DeterministicCodexChatRuntimeOptions = {}) {
    this.accountReadiness = [...(options.accountReadiness ?? [])]
    this.modelCatalogs = [...structuredClone(options.modelCatalogs ?? [])]
    this.effectiveConfigs = [...(options.effectiveConfigs ?? [])]
    this.effectiveSkills = [...(options.effectiveSkills ?? [])]
    this.threadIds = [...(options.threadIds ?? [])]
    this.productTurns = (options.productTurns ?? []).map((turn) => ({
      input: cloneProductTurnInput(turn.input),
      turnId: turn.turnId,
      events: turn.events.map((event) => cloneProductActivity(event)),
    }))
    this.turns = (options.turns ?? []).map((turn) => ({
      input: { ...turn.input },
      turnId: turn.turnId,
      events: [...turn.events],
    }))
  }

  get calls(): readonly DeterministicCodexChatRuntimeCall[] {
    return [...this.callLog]
  }

  async readAccountReadiness(): Promise<CodexAccountReadiness> {
    this.callLog.push({ operation: 'readAccountReadiness' })
    this.requireOpen()
    const readiness = this.accountReadiness.shift()
    if (readiness !== undefined) {
      return { ...readiness }
    }
    throw new Error('No deterministic account readiness remains')
  }

  async readModelCatalog(): Promise<CodexModelCatalog> {
    this.callLog.push({ operation: 'readModelCatalog' })
    this.requireOpen()
    const catalog = this.modelCatalogs.shift()
    if (!catalog) throw new Error('No deterministic model catalog remains')
    return structuredClone(catalog)
  }

  async readEffectiveConfig(input: {
    readonly signal: AbortSignal
  }): Promise<CodexEffectiveConfig> {
    this.callLog.push({ operation: 'readEffectiveConfig' })
    this.requireOpen()
    return this.runNativeContextValue(
      this.effectiveConfigs,
      'effective config read',
      input.signal,
    )
  }

  async listEffectiveSkills(input: {
    readonly signal: AbortSignal
  }): Promise<readonly CodexEffectiveSkill[]> {
    this.callLog.push({ operation: 'listEffectiveSkills' })
    this.requireOpen()
    return this.runNativeContextValue(
      this.effectiveSkills,
      'effective Skill list',
      input.signal,
    )
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
          this.failRuntime(event.code, event.displayMessage)
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

  async startProductTurn(input: StartProductTurnInput): Promise<CodexProductTurn> {
    const recordedInput = cloneProductTurnInput(input)
    this.callLog.push({ operation: 'startProductTurn', input: recordedInput })
    this.requireOpen()
    this.requireTurnAdmission(input.threadId)
    const scripted = this.productTurns[0]
    if (
      scripted === undefined ||
      !sameProductTurnInput(scripted.input, input)
    ) {
      throw new Error('Deterministic product turn input does not match the script')
    }
    for (const event of scripted.events) {
      if (
        event.type !== 'runtime.failed' &&
        (event.threadId !== input.threadId || event.turnId !== scripted.turnId)
      ) {
        throw new Error(
          'Deterministic event identity does not match its scripted turn',
        )
      }
    }
    this.productTurns.shift()
    this.activeTurns.set(input.threadId, scripted.turnId)
    return {
      threadId: input.threadId,
      turnId: scripted.turnId,
      events: iterateEvents(scripted.events, (event) => {
        return this.prepareProductActivity(event)
      }),
    }
  }

  async answerUserInput(input: AnswerUserInput): Promise<void> {
    const recordedInput = cloneAnswerUserInput(input)
    this.callLog.push({ operation: 'answerUserInput', input: recordedInput })
    this.requireOpen()
    await this.settleInteraction(input.interactionId, 'answered')
  }

  async cancelUserInput(input: CancelUserInput): Promise<void> {
    const recordedInput = { ...input }
    this.callLog.push({ operation: 'cancelUserInput', input: recordedInput })
    this.requireOpen()
    await this.settleInteraction(input.interactionId, 'cancelled')
  }

  async interrupt(input: InterruptTurnInput): Promise<void> {
    const recordedInput = { ...input }
    this.callLog.push({ operation: 'interrupt', input: recordedInput })
    this.requireOpen()
    if (this.activeTurns.get(input.threadId) !== input.turnId) {
      throw new Error('Deterministic interrupt references an inactive turn')
    }
    this.clearTurnInteractions(input.threadId, input.turnId)
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
    this.clearAllInteractions()
    this.activeTurns.clear()
    this.closed = true
  }

  private requireOpen(): void {
    if (this.failed) throw new Error('Deterministic Codex chat runtime failed')
    if (this.closed) throw new Error('Deterministic Codex chat runtime is closed')
  }

  private async runNativeContextValue<T>(
    values: DeterministicValue<T>[],
    description: string,
    signal: AbortSignal,
  ): Promise<T> {
    if (signal.aborted) throw nativeContextAbortedError()
    const scripted = values.shift()
    if (scripted === undefined) {
      throw new Error(`No deterministic ${description} remains`)
    }
    let rejectAbort!: (error: CodexChatRuntimeError) => void
    const aborted = new Promise<never>((_resolve, reject) => {
      rejectAbort = reject
    })
    const onAbort = () => rejectAbort(nativeContextAbortedError())
    signal.addEventListener('abort', onAbort, { once: true })
    if (signal.aborted) onAbort()
    try {
      return await Promise.race([
        Promise.resolve(scripted).then((value) => structuredClone(value)),
        aborted,
      ])
    } finally {
      signal.removeEventListener('abort', onAbort)
    }
  }

  private requireTurnAdmission(threadId: CodexThreadId): void {
    if (!this.liveThreads.has(threadId)) {
      throw new Error('Deterministic turn references an unknown thread')
    }
    if (this.activeTurns.has(threadId)) {
      throw new Error('Deterministic thread already has an active turn')
    }
  }

  private async prepareProductActivity(
    event: CodexProductActivity,
  ): Promise<boolean> {
    if (event.type === 'user_input.requested') {
      if (
        this.pendingInteractions.has(event.interactionId) ||
        [...this.pendingInteractions.values()].some(
          ({ threadId, turnId }) =>
            threadId === event.threadId && turnId === event.turnId,
        )
      ) {
        throw new Error('interaction_already_pending')
      }
      this.pendingInteractions.set(event.interactionId, {
        threadId: event.threadId,
        turnId: event.turnId,
        settlement: createDeferred<DeterministicInteractionResolution>(),
        acknowledgement: createDeferred<void>(),
        settled: false,
      })
    } else if (event.type === 'user_input.resolved') {
      const interaction = this.pendingInteractions.get(event.interactionId)
      if (interaction === undefined) {
        throw interactionNotPendingError()
      }
      const resolution = await interaction.settlement.promise
      if (resolution !== event.resolution) {
        const error = new Error(
          'Deterministic user-input resolution does not match the operation',
        )
        this.pendingInteractions.delete(event.interactionId)
        interaction.acknowledgement.reject(error)
        throw error
      }
      this.pendingInteractions.delete(event.interactionId)
      interaction.acknowledgement.resolve(undefined)
    }
    if (event.type === 'runtime.failed') {
      this.failRuntime(event.code, event.displayMessage)
    } else if (event.type === 'turn.completed') {
      this.clearTurnInteractions(event.threadId, event.turnId)
      this.finishTurn(event.threadId, event.turnId)
    }
    return true
  }

  private async settleInteraction(
    interactionId: CodexInteractionId,
    resolution: DeterministicInteractionResolution,
  ): Promise<void> {
    const interaction = this.pendingInteractions.get(interactionId)
    if (interaction === undefined || interaction.settled) {
      throw interactionNotPendingError()
    }
    interaction.settled = true
    interaction.settlement.resolve(resolution)
    await interaction.acknowledgement.promise
  }

  private clearTurnInteractions(
    threadId: CodexThreadId,
    turnId: CodexTurnId,
  ): void {
    for (const [interactionId, interaction] of this.pendingInteractions) {
      if (
        interaction.threadId === threadId &&
        interaction.turnId === turnId
      ) {
        if (interaction.settled) {
          interaction.acknowledgement.reject(interactionNotPendingError())
        }
        this.pendingInteractions.delete(interactionId)
      }
    }
  }

  private clearAllInteractions(
    inFlightError: () => CodexChatRuntimeError = interactionNotPendingError,
  ): void {
    for (const interaction of this.pendingInteractions.values()) {
      if (interaction.settled) {
        interaction.acknowledgement.reject(inFlightError())
      }
    }
    this.pendingInteractions.clear()
  }

  private failRuntime(code: string, displayMessage: string): void {
    if (this.failed) return
    this.failed = true
    this.clearAllInteractions(
      () =>
        new CodexChatRuntimeError({
          code,
          displayMessage,
          unknownOutcome: true,
        }),
    )
    this.activeTurns.clear()
    this.terminalDeferred.resolve(
      new CodexChatRuntimeError({
        code,
        displayMessage,
        unknownOutcome: false,
      }),
    )
  }

  private finishTurn(threadId: CodexThreadId, turnId: CodexTurnId): void {
    if (this.activeTurns.get(threadId) === turnId) {
      this.activeTurns.delete(threadId)
    }
  }
}

export { DeterministicCodexChatRuntime as DeterministicCodexProductRuntime }

function createDeferred<T>(): {
  readonly promise: Promise<T>
  resolve(value: T): void
  reject(reason: unknown): void
} {
  let resolve!: (value: T) => void
  let reject!: (reason: unknown) => void
  const promise = new Promise<T>((settle, fail) => {
    resolve = settle
    reject = fail
  })
  return { promise, resolve, reject }
}

function iterateEvents<Event extends CodexProductActivity>(
  events: readonly Event[],
  onEvent: (event: Event) => boolean | void | Promise<boolean | void>,
): AsyncIterable<Event> {
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

  async function* iterate(): AsyncGenerator<Event> {
    for (const event of events) {
      if ((await onEvent(event)) !== false) yield event
    }
  }
}

function cloneProductTurnInput(
  input: StartProductTurnInput,
): StartProductTurnInput {
  return {
    threadId: input.threadId,
    permissionProfile: input.permissionProfile,
    ...(input.settings === undefined
      ? {}
      : { settings: { ...input.settings } }),
    ...(input.skill === undefined
      ? {}
      : { skill: { ...input.skill } }),
    text: input.text,
  }
}

function sameProductTurnInput(
  left: StartProductTurnInput,
  right: StartProductTurnInput,
): boolean {
  return (
    left.threadId === right.threadId &&
    left.permissionProfile === right.permissionProfile &&
    left.settings?.model === right.settings?.model &&
    left.settings?.reasoningEffort === right.settings?.reasoningEffort &&
    left.settings?.serviceTier === right.settings?.serviceTier &&
    left.skill?.name === right.skill?.name &&
    left.skill?.path === right.skill?.path &&
    left.text === right.text
  )
}

function cloneAnswerUserInput(input: AnswerUserInput): AnswerUserInput {
  return {
    interactionId: input.interactionId,
    answers: Object.fromEntries(
      Object.entries(input.answers).map(([questionId, answers]) => [
        questionId,
        [...answers],
      ]),
    ),
  }
}

function cloneProductActivity(
  activity: CodexProductActivity,
): CodexProductActivity {
  return structuredClone(activity)
}

function nativeContextAbortedError(): CodexChatRuntimeError {
  return new CodexChatRuntimeError({
    code: 'native_context_aborted',
    displayMessage: 'The Codex native context query was cancelled.',
    unknownOutcome: false,
  })
}
