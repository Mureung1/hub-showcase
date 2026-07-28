import assert from 'node:assert/strict'
import test from 'node:test'

import { createCodexMcpReadinessMonitor } from './server-development.js'

test('MCP readiness monitor polls the pinned thread and reports the first loss', async () => {
  const calls: Array<{
    readonly threadId: string
    readonly serverName: string
    readonly expectedTools: readonly string[]
    readonly signal: AbortSignal
  }> = []
  const runtime = {
    async waitForMcpServerReady(input: (typeof calls)[number]) {
      calls.push(input)
      if (calls.length === 2) throw new Error('Adapter unavailable')
    },
  }
  const monitor = createCodexMcpReadinessMonitor(
    runtime,
    {
      threadId: 'thread/health',
      serverName: 'generic_server',
      expectedTools: ['generic_tool'],
    },
    1,
  )

  await monitor.lost
  assert.equal(calls.length, 2)
  assert.deepEqual(
    calls.map(({ signal: _signal, ...call }) => call),
    [
      {
        threadId: 'thread/health',
        serverName: 'generic_server',
        expectedTools: ['generic_tool'],
      },
      {
        threadId: 'thread/health',
        serverName: 'generic_server',
        expectedTools: ['generic_tool'],
      },
    ],
  )
  await monitor.close()
})

test('closing the MCP readiness monitor aborts its in-flight observation without reporting loss', async () => {
  let signal: AbortSignal | undefined
  const started = deferred<void>()
  const runtime = {
    waitForMcpServerReady(input: {
      readonly signal: AbortSignal
    }): Promise<void> {
      signal = input.signal
      started.resolve()
      return new Promise((_resolve, reject) => {
        input.signal.addEventListener(
          'abort',
          () => reject(new Error('aborted')),
          { once: true },
        )
      })
    },
  }
  const monitor = createCodexMcpReadinessMonitor(
    runtime,
    {
      threadId: 'thread/health',
      serverName: 'generic_server',
      expectedTools: ['generic_tool'],
    },
    1,
  )

  await started.promise
  await monitor.close()
  assert.equal(signal?.aborted, true)
  assert.equal(await settlesBeforeImmediate(monitor.lost), false)
})

function deferred<T>(): {
  readonly promise: Promise<T>
  resolve(value?: T): void
} {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((settle) => {
    resolve = settle
  })
  return { promise, resolve }
}

async function settlesBeforeImmediate(
  promise: Promise<unknown>,
): Promise<boolean> {
  return Promise.race([
    promise.then(
      () => true,
      () => true,
    ),
    new Promise<false>((resolve) => setImmediate(() => resolve(false))),
  ])
}
