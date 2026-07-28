import type {
  CodexEffectiveConfig,
  CodexEffectiveSkill,
  CodexNativeContextPort,
} from './native-context-contract.js'
import {
  RUNTIME_CLEANUP_FAILED_MESSAGE,
  RUNTIME_CLOSED_MESSAGE,
  CodexChatRuntimeError,
} from './errors.js'
import {
  NativeContextProbeError,
  runNativeContextProbe,
  type NativeContextProbeSnapshot,
  type RunNativeContextProbeOptions,
} from './native-context-probe.js'

const NATIVE_CONTEXT_ABORTED_MESSAGE =
  'The Codex native context query was cancelled.'
const NATIVE_CONTEXT_FAILED_MESSAGE =
  'The Codex native context could not be verified.'
const RUNTIME_CLOSING_MESSAGE = 'The Codex runtime is closing.'

type ContextSide = 'config' | 'skills'
type CoordinatorState = 'open' | 'closing' | 'closed' | 'cleanup_failed'

export type NativeContextProbeRunner = (
  options: RunNativeContextProbeOptions,
) => Promise<NativeContextProbeSnapshot>

export type NativeContextGenerationCoordinatorOptions = Omit<
  RunNativeContextProbeOptions,
  'signal'
> & {
  /** Package-private test seam. Production callers use the official probe. */
  readonly runProbe?: NativeContextProbeRunner
}

interface NativeContextGeneration {
  readonly controller: AbortController
  readonly callerSignal: AbortSignal
  readonly promise: Promise<NativeContextProbeSnapshot>
  configClaimed: boolean
  skillsClaimed: boolean
}

/**
 * Pairs config and Skill reads that share one caller AbortSignal onto one
 * atomic native App Server observation without exposing its protocol.
 */
export class NativeContextGenerationCoordinator
  implements CodexNativeContextPort
{
  private readonly probeOptions: Omit<
    RunNativeContextProbeOptions,
    'signal'
  >
  private readonly runProbe: NativeContextProbeRunner
  private readonly active = new Set<NativeContextGeneration>()
  private readonly generationBySignal =
    new WeakMap<AbortSignal, NativeContextGeneration>()
  private state: CoordinatorState = 'open'
  private cleanupFailure: CodexChatRuntimeError | undefined
  private closePromise: Promise<void> | undefined

  constructor(options: NativeContextGenerationCoordinatorOptions) {
    const { runProbe: injectedProbe, ...probeOptions } = options
    this.runProbe = injectedProbe ?? runNativeContextProbe
    this.probeOptions = cloneProbeOptions(probeOptions)
  }

  async readEffectiveConfig(input: {
    readonly signal: AbortSignal
  }): Promise<CodexEffectiveConfig> {
    const snapshot = await this.readSide('config', input.signal)
    return cloneConfig(snapshot.config)
  }

  async listEffectiveSkills(input: {
    readonly signal: AbortSignal
  }): Promise<readonly CodexEffectiveSkill[]> {
    const snapshot = await this.readSide('skills', input.signal)
    return cloneSkills(snapshot.skills)
  }

  close(): Promise<void> {
    if (this.closePromise) return this.closePromise
    if (this.state === 'closed') return Promise.resolve()

    this.state = 'closing'
    const generations = [...this.active]
    for (const generation of generations) {
      generation.controller.abort()
    }

    this.closePromise = this.finishClose(generations)
    return this.closePromise
  }

  private async readSide(
    side: ContextSide,
    signal: AbortSignal,
  ): Promise<NativeContextProbeSnapshot> {
    requireAbortSignal(signal)
    if (signal.aborted) throw nativeContextAbortedError()
    this.assertAvailable()

    const generation = this.claimGeneration(side, signal)
    let callerAborted = false
    const onAbort = () => {
      callerAborted = true
      this.releaseGeneration(generation)
      generation.controller.abort()
    }
    signal.addEventListener('abort', onAbort, { once: true })
    if (signal.aborted) onAbort()

    try {
      const snapshot = await generation.promise
      if (callerAborted) throw nativeContextAbortedError()
      return snapshot
    } catch (cause) {
      if (callerAborted && !isRuntimeCleanupFailure(cause)) {
        throw nativeContextAbortedError()
      }
      throw cause
    } finally {
      signal.removeEventListener('abort', onAbort)
    }
  }

  private claimGeneration(
    side: ContextSide,
    callerSignal: AbortSignal,
  ): NativeContextGeneration {
    let generation = this.generationBySignal.get(callerSignal)
    if (!generation) {
      generation = this.startGeneration(callerSignal)
      this.generationBySignal.set(callerSignal, generation)
    } else if (isClaimed(generation, side)) {
      throw nativeContextFailedError()
    }

    claim(generation, side)
    if (generation.configClaimed && generation.skillsClaimed) {
      this.releaseGeneration(generation)
    }
    return generation
  }

  private startGeneration(
    callerSignal: AbortSignal,
  ): NativeContextGeneration {
    const controller = new AbortController()
    let generation: NativeContextGeneration
    generation = {
      controller,
      callerSignal,
      configClaimed: false,
      skillsClaimed: false,
      promise: Promise.resolve().then(() =>
        this.runGeneration(generation),
      ),
    }
    this.active.add(generation)
    return generation
  }

  private async runGeneration(
    generation: NativeContextGeneration,
  ): Promise<NativeContextProbeSnapshot> {
    try {
      const snapshot = cloneSnapshot(
        await this.runProbe({
          ...this.probeOptions,
          signal: generation.controller.signal,
        }),
      )
      setImmediate(() => {
        this.releaseGeneration(generation)
      })
      return snapshot
    } catch (cause) {
      const projected = projectProbeError(cause)
      if (projected.code === 'runtime_cleanup_failed') {
        this.latchCleanupFailure(projected, generation)
      }
      this.releaseGeneration(generation)
      throw projected
    } finally {
      this.active.delete(generation)
    }
  }

  private latchCleanupFailure(
    error: CodexChatRuntimeError,
    failedGeneration: NativeContextGeneration,
  ): void {
    if (!this.cleanupFailure) this.cleanupFailure = error
    if (this.state === 'open') this.state = 'cleanup_failed'
    this.releaseGeneration(failedGeneration)
    for (const generation of this.active) {
      if (generation !== failedGeneration) generation.controller.abort()
    }
  }

  private releaseGeneration(
    generation: NativeContextGeneration,
  ): void {
    if (
      this.generationBySignal.get(generation.callerSignal) === generation
    ) {
      this.generationBySignal.delete(generation.callerSignal)
    }
  }

  private assertAvailable(): void {
    if (this.cleanupFailure) throw this.cleanupFailure
    if (this.state === 'open') return
    if (this.state === 'closing') throw runtimeClosingError()
    throw runtimeClosedError()
  }

  private async finishClose(
    generations: readonly NativeContextGeneration[],
  ): Promise<void> {
    const outcomes = await Promise.allSettled(
      generations.map((generation) => generation.promise),
    )
    const cleanupFailure =
      this.cleanupFailure ??
      outcomes
        .filter(
          (
            outcome,
          ): outcome is PromiseRejectedResult =>
            outcome.status === 'rejected',
        )
        .map((outcome) => outcome.reason)
        .find(isRuntimeCleanupFailure)

    if (cleanupFailure) {
      this.state = 'cleanup_failed'
      throw cleanupFailure
    }
    this.state = 'closed'
  }
}

function isClaimed(
  generation: NativeContextGeneration,
  side: ContextSide,
): boolean {
  return side === 'config'
    ? generation.configClaimed
    : generation.skillsClaimed
}

function claim(
  generation: NativeContextGeneration,
  side: ContextSide,
): void {
  if (side === 'config') {
    generation.configClaimed = true
  } else {
    generation.skillsClaimed = true
  }
}

function cloneProbeOptions(
  options: Omit<RunNativeContextProbeOptions, 'signal'>,
): Omit<RunNativeContextProbeOptions, 'signal'> {
  return Object.freeze({
    ...options,
    // The verifier freezes this object and retains its launch authority by
    // identity. Preserve that opaque capability so every sidecar can perform
    // a fresh complete-tree re-attestation.
    bundle: options.bundle,
    environment: Object.freeze({ ...options.environment }),
    application: Object.freeze({ ...options.application }),
    budgets: options.budgets
      ? Object.freeze({ ...options.budgets })
      : undefined,
    deadlines: options.deadlines
      ? Object.freeze({ ...options.deadlines })
      : undefined,
    testCommandOverride: options.testCommandOverride
      ? Object.freeze([...options.testCommandOverride]) as readonly [
          string,
          ...string[],
        ]
      : undefined,
  })
}

function cloneSnapshot(
  snapshot: NativeContextProbeSnapshot,
): NativeContextProbeSnapshot {
  return Object.freeze({
    config: cloneConfig(snapshot.config),
    skills: cloneSkills(snapshot.skills),
  })
}

function cloneConfig(config: CodexEffectiveConfig): CodexEffectiveConfig {
  return Object.freeze({
    projectRootMarkers: Object.freeze([...config.projectRootMarkers]),
    globalInstructionsFile: config.globalInstructionsFile,
    mcpServers: Object.freeze(
      config.mcpServers.map((server) =>
        Object.freeze({
          name: server.name,
          command: server.command,
          args: Object.freeze([...server.args]),
          envVars: Object.freeze(
            server.envVars.map((variable) =>
              Object.freeze({ ...variable }),
            ),
          ),
          cwd: server.cwd,
          toolTimeoutSec: server.toolTimeoutSec,
          env: Object.freeze({ ...server.env }),
          enabled: server.enabled,
          required: server.required,
          enabledTools:
            server.enabledTools === null
              ? null
              : Object.freeze([...server.enabledTools]),
          disabledTools: Object.freeze([...server.disabledTools]),
        }),
      ),
    ),
  })
}

function cloneSkills(
  skills: readonly CodexEffectiveSkill[],
): readonly CodexEffectiveSkill[] {
  return Object.freeze(
    skills.map((skill) =>
      Object.freeze({
        name: skill.name,
        enabled: skill.enabled,
        sourceRoot: skill.sourceRoot,
      }),
    ),
  )
}

function projectProbeError(cause: unknown): CodexChatRuntimeError {
  if (isRuntimeCleanupFailure(cause)) {
    return runtimeCleanupFailedError()
  }
  if (cause instanceof NativeContextProbeError) {
    if (cause.code === 'aborted') return nativeContextAbortedError()
    if (cause.code === 'cleanup_failed') {
      return runtimeCleanupFailedError()
    }
  }
  return nativeContextFailedError()
}

function isRuntimeCleanupFailure(
  cause: unknown,
): cause is CodexChatRuntimeError {
  return (
    cause instanceof CodexChatRuntimeError &&
    cause.code === 'runtime_cleanup_failed'
  )
}

function nativeContextAbortedError(): CodexChatRuntimeError {
  return new CodexChatRuntimeError({
    code: 'native_context_aborted',
    displayMessage: NATIVE_CONTEXT_ABORTED_MESSAGE,
    unknownOutcome: false,
  })
}

function nativeContextFailedError(): CodexChatRuntimeError {
  return new CodexChatRuntimeError({
    code: 'native_context_failed',
    displayMessage: NATIVE_CONTEXT_FAILED_MESSAGE,
    unknownOutcome: false,
  })
}

function runtimeClosingError(): CodexChatRuntimeError {
  return new CodexChatRuntimeError({
    code: 'runtime_closing',
    displayMessage: RUNTIME_CLOSING_MESSAGE,
    unknownOutcome: false,
  })
}

function runtimeClosedError(): CodexChatRuntimeError {
  return new CodexChatRuntimeError({
    code: 'runtime_closed',
    displayMessage: RUNTIME_CLOSED_MESSAGE,
    unknownOutcome: false,
  })
}

function runtimeCleanupFailedError(): CodexChatRuntimeError {
  return new CodexChatRuntimeError({
    code: 'runtime_cleanup_failed',
    displayMessage: RUNTIME_CLEANUP_FAILED_MESSAGE,
    unknownOutcome: false,
  })
}

function requireAbortSignal(signal: AbortSignal): void {
  if (
    typeof signal !== 'object' ||
    signal === null ||
    typeof signal.aborted !== 'boolean' ||
    typeof signal.addEventListener !== 'function' ||
    typeof signal.removeEventListener !== 'function'
  ) {
    throw new TypeError('signal must be an AbortSignal')
  }
}
