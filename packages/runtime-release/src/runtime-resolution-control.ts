/// <reference types="node" />

import { performance } from 'node:perf_hooks'

import type {
  RuntimeResolutionPhase,
  RuntimeResolveProgress,
} from './contract.js'
import {
  RuntimeReleaseAuthorityError,
  runtimeAuthorityError,
} from './runtime-release-authority.js'

const PHASE_ORDER: Readonly<
  Record<RuntimeResolutionPhase, number>
> = {
  checking_cache: 0,
  downloading: 1,
  verifying_archive: 2,
  installing: 3,
  verifying_runtime: 4,
  ready: 5,
}

export type RuntimeResolutionScheduler = {
  readonly monotonicNowMs: () => number
  readonly wallNowMs: () => number
  readonly sleep: (
    delayMs: number,
    signal: AbortSignal,
  ) => Promise<void>
  readonly arm: (
    delayMs: number,
    onElapsed: () => void,
  ) => () => void
}

/**
 * Isolates a caller-owned reporter from resolution and enforces the frozen
 * phase/byte monotonicity without adding internal state to public progress.
 */
export class RuntimeResolutionProgressEmitter {
  readonly #report: (progress: RuntimeResolveProgress) => void
  #downloadHighWater = -1
  #downloadTotal: number | undefined
  #phaseIndex = -1
  #stopped = false

  constructor(
    report: (progress: RuntimeResolveProgress) => void,
  ) {
    this.#report = report
  }

  phase(phase: RuntimeResolutionPhase): void {
    if (this.#stopped) return
    const nextIndex = PHASE_ORDER[phase]
    if (nextIndex <= this.#phaseIndex) return
    this.#phaseIndex = nextIndex
    this.#emit({ phase })
    if (phase === 'ready') this.#stopped = true
  }

  download(receivedBytes: number, totalBytes: number): void {
    if (
      this.#stopped ||
      !Number.isSafeInteger(receivedBytes) ||
      receivedBytes < 0 ||
      !Number.isSafeInteger(totalBytes) ||
      totalBytes < 0 ||
      receivedBytes > totalBytes ||
      (this.#downloadTotal !== undefined &&
        this.#downloadTotal !== totalBytes) ||
      PHASE_ORDER.downloading < this.#phaseIndex
    ) {
      return
    }
    if (this.#phaseIndex < PHASE_ORDER.downloading) {
      this.#phaseIndex = PHASE_ORDER.downloading
    }
    this.#downloadTotal = totalBytes
    const highWater = Math.max(
      this.#downloadHighWater,
      receivedBytes,
    )
    if (highWater === this.#downloadHighWater) return
    this.#downloadHighWater = highWater
    this.#emit({
      phase: 'downloading',
      receivedBytes: highWater,
      totalBytes,
    })
  }

  stop(): void {
    this.#stopped = true
  }

  #emit(progress: RuntimeResolveProgress): void {
    try {
      const result = this.#report(
        Object.freeze({ ...progress }),
      ) as unknown
      if (isPromiseLike(result)) {
        void Promise.resolve(result).catch(() => undefined)
      }
    } catch {
      // A presentation callback cannot become Runtime authority.
    }
  }
}

/**
 * Owns one resolve call's monotonic startup budget. The linked signal is
 * passed to lease, transport, extraction, and verification work. Caller
 * cancellation remains distinguishable from deadline exhaustion.
 */
export class RuntimeResolutionDeadline {
  readonly #callerSignal: AbortSignal
  readonly #controller = new AbortController()
  readonly #deadlineMs: number
  readonly #onCallerAbort: () => void
  readonly #scheduler: RuntimeResolutionScheduler
  readonly #stopTimer: () => void
  #abortKind: 'caller' | 'deadline' | undefined
  #closed = false

  constructor(input: {
    readonly callerSignal: AbortSignal
    readonly scheduler?: RuntimeResolutionScheduler
    readonly timeoutMs: number
  }) {
    if (
      !Number.isSafeInteger(input.timeoutMs) ||
      input.timeoutMs <= 0
    ) {
      throw runtimeAuthorityError('runtime_incompatible', {
        kind: 'runtime_resolution_deadline_invalid',
      })
    }
    this.#callerSignal = input.callerSignal
    this.#scheduler =
      input.scheduler ?? createRuntimeResolutionScheduler()
    const startedAt = this.#scheduler.monotonicNowMs()
    if (!Number.isFinite(startedAt)) {
      throw runtimeAuthorityError('runtime_incompatible', {
        kind: 'runtime_resolution_clock_invalid',
      })
    }
    this.#deadlineMs = startedAt + input.timeoutMs
    this.#onCallerAbort = () => this.#abort('caller')
    if (this.#callerSignal.aborted) {
      this.#abort('caller')
    } else {
      this.#callerSignal.addEventListener(
        'abort',
        this.#onCallerAbort,
        { once: true },
      )
    }
    this.#stopTimer = this.#scheduler.arm(
      input.timeoutMs,
      () => this.#abort('deadline'),
    )
  }

  get signal(): AbortSignal {
    return this.#controller.signal
  }

  remainingMs(): number {
    return Math.max(
      0,
      this.#deadlineMs - this.#scheduler.monotonicNowMs(),
    )
  }

  throwIfStopped(): void {
    if (this.#abortKind === 'caller') {
      throw cancelledError()
    }
    if (this.#abortKind === 'deadline') {
      throw deadlineError()
    }
    if (this.#callerSignal.aborted) {
      this.#abort('caller')
      throw cancelledError()
    }
    if (this.remainingMs() <= 0) {
      this.#abort('deadline')
      throw deadlineError()
    }
  }

  async waitForRetryAfter(
    values: readonly string[],
  ): Promise<void> {
    this.throwIfStopped()
    const delayMs = decodeRetryAfterDelayMs(
      values,
      this.#scheduler.wallNowMs(),
    )
    const remainingMs = this.remainingMs()
    if (delayMs >= remainingMs) {
      throw deadlineError()
    }
    if (delayMs === 0) return
    try {
      await this.#scheduler.sleep(delayMs, this.signal)
    } catch (error) {
      this.throwIfStopped()
      if (error instanceof RuntimeReleaseAuthorityError) {
        throw error
      }
      throw runtimeAuthorityError(
        'runtime_network_unavailable',
        {
          kind: 'runtime_resolution_retry_wait_failed',
          cause: error,
        },
      )
    }
    this.throwIfStopped()
  }

  normalize(error: unknown): RuntimeReleaseAuthorityError {
    if (
      error instanceof RuntimeReleaseAuthorityError &&
      error.failure.code !== 'runtime_cancelled'
    ) {
      return error
    }
    if (this.#abortKind === 'deadline') return deadlineError()
    if (
      this.#abortKind === 'caller' ||
      this.#callerSignal.aborted
    ) {
      return cancelledError()
    }
    if (error instanceof RuntimeReleaseAuthorityError) {
      return error
    }
    return runtimeAuthorityError('runtime_storage_unavailable', {
      kind: 'runtime_resolution_unexpected_failure',
      cause: error,
    })
  }

  close(): void {
    if (this.#closed) return
    this.#closed = true
    this.#stopTimer()
    this.#callerSignal.removeEventListener(
      'abort',
      this.#onCallerAbort,
    )
  }

  #abort(kind: 'caller' | 'deadline'): void {
    if (this.#abortKind !== undefined) return
    this.#abortKind = kind
    this.#controller.abort()
  }
}

export function decodeRetryAfterDelayMs(
  values: readonly string[],
  wallNowMs: number,
): number {
  if (
    values.length !== 1 ||
    !Number.isFinite(wallNowMs)
  ) {
    return 0
  }
  const value = values[0]
  if (/^(?:0|[1-9][0-9]*)$/u.test(value)) {
    const seconds = Number(value)
    if (
      !Number.isSafeInteger(seconds) ||
      seconds > Math.floor(Number.MAX_SAFE_INTEGER / 1000)
    ) {
      return 0
    }
    return seconds * 1000
  }
  if (
    !/^(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun), [0-9]{2} (?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) [0-9]{4} [0-9]{2}:[0-9]{2}:[0-9]{2} GMT$/u.test(
      value,
    )
  ) {
    return 0
  }
  const parsed = Date.parse(value)
  if (!Number.isFinite(parsed) || parsed <= wallNowMs) return 0
  return parsed - wallNowMs
}

export function createRuntimeResolutionScheduler(): RuntimeResolutionScheduler {
  return {
    monotonicNowMs: () => performance.now(),
    wallNowMs: () => Date.now(),
    sleep: (delayMs, signal) =>
      new Promise<void>((resolve, reject) => {
        if (signal.aborted) {
          reject(cancelledError())
          return
        }
        const onAbort = () => {
          clearTimeout(timer)
          signal.removeEventListener('abort', onAbort)
          reject(cancelledError())
        }
        const timer = setTimeout(() => {
          signal.removeEventListener('abort', onAbort)
          resolve()
        }, delayMs)
        timer.unref()
        signal.addEventListener('abort', onAbort, {
          once: true,
        })
      }),
    arm: (delayMs, onElapsed) => {
      const timer = setTimeout(onElapsed, delayMs)
      timer.unref()
      return () => clearTimeout(timer)
    },
  }
}

function cancelledError(): RuntimeReleaseAuthorityError {
  return runtimeAuthorityError('runtime_cancelled', {
    kind: 'runtime_resolution_cancelled',
  })
}

function deadlineError(): RuntimeReleaseAuthorityError {
  return runtimeAuthorityError(
    'runtime_network_unavailable',
    {
      kind: 'runtime_resolution_deadline_exhausted',
    },
  )
}

function isPromiseLike(
  value: unknown,
): value is PromiseLike<unknown> {
  return (
    typeof value === 'object' &&
    value !== null &&
    'then' in value &&
    typeof value.then === 'function'
  )
}
