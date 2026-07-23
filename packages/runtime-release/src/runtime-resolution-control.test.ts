import assert from 'node:assert/strict'
import test from 'node:test'

import type {
  RuntimeResolveProgress,
} from './contract.js'
import {
  RuntimeReleaseAuthorityError,
  runtimeAuthorityError,
} from './runtime-release-authority.js'
import {
  RuntimeResolutionDeadline,
  RuntimeResolutionProgressEmitter,
  decodeRetryAfterDelayMs,
} from './runtime-resolution-control.js'
import type {
  RuntimeResolutionScheduler,
} from './runtime-resolution-control.js'

test('progress is monotonic and reporter failures never become Runtime failures', async () => {
  const observed: RuntimeResolveProgress[] = []
  let calls = 0
  const report = ((progress: RuntimeResolveProgress) => {
    calls += 1
    observed.push(progress)
    if (calls === 1) throw new Error('presentation failed')
    if (calls === 2) {
      return Promise.reject(new Error('async presentation failed'))
    }
  }) as (progress: RuntimeResolveProgress) => void
  const emitter = new RuntimeResolutionProgressEmitter(report)

  emitter.phase('checking_cache')
  emitter.phase('downloading')
  emitter.download(10, 100)
  emitter.download(5, 100)
  emitter.download(20, 100)
  emitter.download(30, 101)
  emitter.phase('checking_cache')
  emitter.phase('verifying_archive')
  emitter.stop()
  emitter.phase('ready')
  await Promise.resolve()

  assert.deepEqual(observed, [
    { phase: 'checking_cache' },
    { phase: 'downloading' },
    {
      phase: 'downloading',
      receivedBytes: 10,
      totalBytes: 100,
    },
    {
      phase: 'downloading',
      receivedBytes: 20,
      totalBytes: 100,
    },
    { phase: 'verifying_archive' },
  ])
  assert.equal(
    Object.isFrozen(observed[0]),
    true,
  )
})

test('ready is terminal and emitted at most once', () => {
  const observed: RuntimeResolveProgress[] = []
  const emitter = new RuntimeResolutionProgressEmitter(
    (progress) => observed.push(progress),
  )
  emitter.phase('checking_cache')
  emitter.phase('verifying_runtime')
  emitter.phase('ready')
  emitter.phase('ready')
  emitter.download(50, 100)

  assert.deepEqual(
    observed.map((progress) => progress.phase),
    ['checking_cache', 'verifying_runtime', 'ready'],
  )
})

test('Retry-After accepts one bounded delta or IMF-fixdate only', async () => {
  const fake = createFakeScheduler()
  const deadline = new RuntimeResolutionDeadline({
    callerSignal: new AbortController().signal,
    scheduler: fake.scheduler,
    timeoutMs: 10_000,
  })
  try {
    await deadline.waitForRetryAfter(['2'])
    assert.deepEqual(fake.sleeps, [2_000])
    const future = new Date(fake.wallNowMs + 3_000).toUTCString()
    await deadline.waitForRetryAfter([future])
    assert.deepEqual(fake.sleeps, [2_000, 3_000])

    await deadline.waitForRetryAfter([])
    await deadline.waitForRetryAfter(['1', '2'])
    await deadline.waitForRetryAfter(['not-a-date'])
    await deadline.waitForRetryAfter([
      new Date(fake.wallNowMs - 1_000).toUTCString(),
    ])
    assert.deepEqual(fake.sleeps, [2_000, 3_000])

    await assert.rejects(
      deadline.waitForRetryAfter(['5']),
      hasFailureCode('runtime_network_unavailable'),
    )
    assert.deepEqual(fake.sleeps, [2_000, 3_000])
  } finally {
    deadline.close()
  }
})

test('Retry-After parsing rejects ambiguous and noncanonical values as zero delay', () => {
  const wallNowMs = Date.parse('2026-07-24T00:00:00Z')
  assert.equal(decodeRetryAfterDelayMs([], wallNowMs), 0)
  assert.equal(
    decodeRetryAfterDelayMs(['1', '2'], wallNowMs),
    0,
  )
  assert.equal(decodeRetryAfterDelayMs(['01'], wallNowMs), 0)
  assert.equal(
    decodeRetryAfterDelayMs(
      ['2026-07-24T00:00:01Z'],
      wallNowMs,
    ),
    0,
  )
  assert.equal(
    decodeRetryAfterDelayMs(
      ['Fri, 24 Jul 2026 00:00:01 GMT'],
      wallNowMs,
    ),
    1_000,
  )
})

test('caller abort during retry wait stays cancelled', async () => {
  const controller = new AbortController()
  const fake = createFakeScheduler({
    beforeSleep: () => controller.abort(),
  })
  const deadline = new RuntimeResolutionDeadline({
    callerSignal: controller.signal,
    scheduler: fake.scheduler,
    timeoutMs: 10_000,
  })
  try {
    await assert.rejects(
      deadline.waitForRetryAfter(['1']),
      hasFailureCode('runtime_cancelled'),
    )
  } finally {
    deadline.close()
  }
})

test('active deadline abort normalizes linked cancellation to network unavailable', () => {
  const fake = createFakeScheduler()
  const deadline = new RuntimeResolutionDeadline({
    callerSignal: new AbortController().signal,
    scheduler: fake.scheduler,
    timeoutMs: 10_000,
  })
  try {
    fake.elapseDeadline()
    assert.equal(deadline.signal.aborted, true)
    assert.throws(
      () => deadline.throwIfStopped(),
      hasFailureCode('runtime_network_unavailable'),
    )
    assert.equal(
      deadline.normalize(
        runtimeAuthorityError('runtime_cancelled', {
          kind: 'downstream_cancelled',
        }),
      ).failure.code,
      'runtime_network_unavailable',
    )
  } finally {
    deadline.close()
  }
})

function createFakeScheduler(options: {
  readonly beforeSleep?: () => void
} = {}): {
  readonly scheduler: RuntimeResolutionScheduler
  readonly sleeps: number[]
  readonly wallNowMs: number
  elapseDeadline(): void
} {
  let monotonicNowMs = 1_000
  const wallNowMs = Date.parse('2026-07-24T00:00:00Z')
  let deadlineCallback: (() => void) | undefined
  const sleeps: number[] = []
  return {
    scheduler: {
      monotonicNowMs: () => monotonicNowMs,
      wallNowMs: () => wallNowMs,
      sleep: async (delayMs, signal) => {
        sleeps.push(delayMs)
        options.beforeSleep?.()
        if (signal.aborted) throw new Error('sleep aborted')
        monotonicNowMs += delayMs
      },
      arm: (_delayMs, callback) => {
        deadlineCallback = callback
        return () => {
          deadlineCallback = undefined
        }
      },
    },
    sleeps,
    wallNowMs,
    elapseDeadline: () => {
      monotonicNowMs = 11_000
      deadlineCallback?.()
    },
  }
}

function hasFailureCode(expected: string) {
  return (error: unknown): boolean => {
    assert.equal(
      error instanceof RuntimeReleaseAuthorityError,
      true,
    )
    assert.equal(
      (error as RuntimeReleaseAuthorityError).failure.code,
      expected,
    )
    return true
  }
}
