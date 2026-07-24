import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
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
  assert.equal(
    decodeRetryAfterDelayMs(
      ['Sat, 24 Jul 2026 00:00:01 GMT'],
      wallNowMs,
    ),
    0,
  )
  assert.equal(
    decodeRetryAfterDelayMs(
      ['Wed, 31 Feb 2027 00:00:01 GMT'],
      wallNowMs,
    ),
    0,
  )
  assert.equal(
    decodeRetryAfterDelayMs(
      ['Sat, 25 Jul 2026 24:00:00 GMT'],
      wallNowMs,
    ),
    0,
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

test('an elapsed monotonic deadline wins over a later caller abort', () => {
  const controller = new AbortController()
  const fake = createFakeScheduler()
  const deadline = new RuntimeResolutionDeadline({
    callerSignal: controller.signal,
    scheduler: fake.scheduler,
    timeoutMs: 10_000,
  })
  try {
    fake.advanceToDeadlineWithoutCallback()
    controller.abort()

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

test('production retry and deadline timers keep a pre-listener process alive', async () => {
  const moduleUrl = new URL(
    './runtime-resolution-control.ts',
    import.meta.url,
  ).href
  const script = `
    import { createRuntimeResolutionScheduler } from ${JSON.stringify(moduleUrl)}
    const scheduler = createRuntimeResolutionScheduler()
    await scheduler.sleep(25, new AbortController().signal)
    await new Promise((resolve) => scheduler.arm(25, resolve))
    process.stdout.write('retry-and-deadline-fired')
  `
  const result = await runNodeProbe(script)
  assert.deepEqual(result, {
    code: 0,
    signal: null,
    stderr: '',
    stdout: 'retry-and-deadline-fired',
  })
})

function createFakeScheduler(options: {
  readonly beforeSleep?: () => void
} = {}): {
  readonly scheduler: RuntimeResolutionScheduler
  readonly sleeps: number[]
  readonly wallNowMs: number
  advanceToDeadlineWithoutCallback(): void
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
    advanceToDeadlineWithoutCallback: () => {
      monotonicNowMs = 11_000
    },
    elapseDeadline: () => {
      monotonicNowMs = 11_000
      deadlineCallback?.()
    },
  }
}

function runNodeProbe(script: string): Promise<{
  readonly code: number | null
  readonly signal: NodeJS.Signals | null
  readonly stderr: string
  readonly stdout: string
}> {
  return new Promise((resolve, reject) => {
    const child = spawn(
      process.execPath,
      [
        '--import',
        import.meta.resolve('tsx'),
        '--input-type=module',
        '--eval',
        script,
      ],
      {
        stdio: ['ignore', 'pipe', 'pipe'],
      },
    )
    let stderr = ''
    let stdout = ''
    const timer = setTimeout(() => {
      child.kill('SIGKILL')
      reject(new Error('Runtime resolution liveness probe timed out'))
    }, 2_000)
    child.stderr.setEncoding('utf8')
    child.stderr.on('data', (chunk: string) => {
      stderr += chunk
    })
    child.stdout.setEncoding('utf8')
    child.stdout.on('data', (chunk: string) => {
      stdout += chunk
    })
    child.once('error', (error) => {
      clearTimeout(timer)
      reject(error)
    })
    child.once('exit', (code, signal) => {
      clearTimeout(timer)
      resolve({ code, signal, stderr, stdout })
    })
  })
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
