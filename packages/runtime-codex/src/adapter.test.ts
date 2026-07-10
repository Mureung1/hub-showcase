import assert from 'node:assert/strict'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import type { AgentRuntimeKernel, RuntimeRunLog } from '@ay-ple/runtime-core'
import {
  createInMemoryRuntimeKernel,
  waitForRuntimeCondition,
} from '@ay-ple/runtime-core/testing'
import {
  hasCodexDebugClientRequest,
  hasCodexDebugNotification,
  hasCodexDebugTurnCompletionStatus,
  hasCodexInterruptTimeoutDebugEvidence,
  hasCodexMissingTurnScopeDebugEvidence,
  readCodexDebugClientRequest,
  withFakeCodexAppServer,
  type FakeCodexAppServerScenario,
} from '@ay-ple/runtime-codex/testing'
import { CodexRuntimeAdapter } from './index.js'

test('CodexRuntimeAdapter maps Codex turn notifications to normalized run output', async () => {
  await withFakeCodexAppServer(
    {
      userAgent: 'fake-codex-turn-server',
      threadId: 'thread-1',
      turnId: 'turn-1',
      agentMessageDeltas: [
        {
          turnId: 'other-turn',
          itemId: 'ignored-item',
          delta: 'ignored turn',
        },
        {
          threadId: 'other-thread',
          itemId: 'ignored-item',
          delta: 'ignored thread',
        },
        {
          itemId: 'item-1',
          delta: 'Hello ',
        },
        {
          itemId: 'item-1',
          delta: 'from Codex',
        },
      ],
      turnCompletions: [
        {
          turnId: 'other-turn',
          status: 'completed',
        },
        {
          turnId: 'other-turn',
          status: 'failed',
        },
        {
          status: 'completed',
        },
      ],
    },
    async ({ rawClientOptions }) => {
      const adapter = new CodexRuntimeAdapter({
        rawClientOptions,
      })
      const kernel = await createInMemoryRuntimeKernel({
        adapters: [adapter],
        now: () => new Date('2026-07-09T00:00:00.000Z'),
      })

      const startedLog = await kernel.startRun({
        adapter: 'codex',
        prompt: 'Explain runtime parity',
      })
      const completedLog = await kernel.waitForRun(startedLog.runId)

      assert.equal(completedLog.status, 'completed')
      assert.equal(completedLog.output, 'Hello from Codex')
      assert.deepEqual(
        completedLog.events.map((event) => event.type),
        ['started', 'output_delta', 'output_delta', 'completed'],
      )
      assert.deepEqual(
        completedLog.events
          .filter((event) => event.type === 'output_delta')
          .map((event) => event.delta),
        ['Hello ', 'from Codex'],
      )

      const debugLog = completedLog.debugLog ?? []
      const outboundMessages = debugLog
        .filter((entry) => entry.source === 'client' && entry.kind === 'stdin')
        .map((entry) => JSON.parse(entry.raw ?? '{}') as Record<string, unknown>)

      assert.deepEqual(
        outboundMessages.map((message) => message.method),
        ['initialize', 'initialized', 'thread/start', 'turn/start'],
      )

      const turnStart = outboundMessages.find(
        (message) => message.method === 'turn/start',
      )

      assert.deepEqual(turnStart?.params, {
        threadId: 'thread-1',
        input: [
          {
            type: 'text',
            text: 'Explain runtime parity',
            text_elements: [],
          },
        ],
      })
      assert.ok(
        debugLog.some(
          (entry) =>
            entry.source === 'server' &&
            entry.kind === 'notification' &&
            entry.data?.method === 'item/agentMessage/delta',
        ),
        'expected agent delta notification in debug log',
      )
      assert.ok(
        debugLog.some(
          (entry) =>
            entry.source === 'server' &&
            entry.kind === 'notification' &&
            entry.data?.method === 'turn/completed',
        ),
        'expected turn completed notification in debug log',
      )
    },
  )
})

test('CodexRuntimeAdapter sends turn interrupt and preserves normalized cancellation', async () => {
  await withFakeCodexAppServer(
    {
      threadId: 'thread-cancel',
      turnId: 'turn-cancel',
      turnCompletions: [],
      interruptTurnCompletion: {
        status: 'interrupted',
      },
    },
    async ({ rawClientOptions }) => {
      const kernel = await createInMemoryRuntimeKernel({
        adapters: [
          new CodexRuntimeAdapter({
            rawClientOptions,
          }),
        ],
        now: () => new Date('2026-07-09T00:00:00.000Z'),
      })
      const startedLog = await kernel.startRun({
        adapter: 'codex',
        prompt: 'Cancel this Codex run',
      })

      await waitForRunLog(kernel, startedLog.runId, (log) =>
        hasCodexDebugClientRequest(log.debugLog, 'turn/start'),
      )

      const cancellingLog = await kernel.cancelRun(startedLog.runId)
      const logWithInterrupt = await waitForRunLog(
        kernel,
        startedLog.runId,
        (log) =>
          hasCodexDebugClientRequest(log.debugLog, 'turn/interrupt') &&
          hasCodexDebugTurnCompletionStatus(log.debugLog, 'interrupted'),
      )

      assert.equal(cancellingLog?.status, 'cancelling')
      assert.equal(logWithInterrupt.status, 'cancelled')
      assert.deepEqual(
        logWithInterrupt.events.map((event) => event.type),
        ['started', 'cancelling', 'cancelled'],
      )
      assert.deepEqual(
        readCodexDebugClientRequest(
          logWithInterrupt.debugLog,
          'turn/interrupt',
        )?.params,
        {
          threadId: 'thread-cancel',
          turnId: 'turn-cancel',
        },
      )
    },
  )
})

test('CodexRuntimeAdapter records failed run when turn interrupt request fails', async () => {
  await withFakeCodexAppServer(
    {
      threadId: 'thread-interrupt-error',
      turnId: 'turn-interrupt-error',
      turnCompletions: [],
      turnInterruptError: 'interrupt unavailable',
    },
    async ({ rawClientOptions }) => {
      const kernel = await createInMemoryRuntimeKernel({
        adapters: [
          new CodexRuntimeAdapter({
            rawClientOptions,
          }),
        ],
        now: () => new Date('2026-07-09T00:00:00.000Z'),
      })
      const startedLog = await kernel.startRun({
        adapter: 'codex',
        prompt: 'Cancel this Codex run',
      })

      await waitForRunLog(kernel, startedLog.runId, (log) =>
        hasCodexDebugClientRequest(log.debugLog, 'turn/start'),
      )

      const cancellingLog = await kernel.cancelRun(startedLog.runId)
      const terminalLog = await kernel.waitForRun(startedLog.runId)

      assert.equal(cancellingLog?.status, 'cancelling')
      assert.equal(terminalLog.status, 'failed')
      assert.match(
        terminalLog.error ?? '',
        /Codex turn interrupt failed: turn\/interrupt returned error: interrupt unavailable/,
      )
      assert.deepEqual(
        terminalLog.events.map((event) => event.type),
        ['started', 'cancelling', 'failed'],
      )
      assert.ok(
        hasCodexDebugClientRequest(terminalLog.debugLog, 'turn/interrupt'),
      )
    },
  )
})

test('CodexRuntimeAdapter records failed run when turn interrupt completion is missing', async () => {
  await withFakeCodexAppServer(
    {
      threadId: 'thread-interrupt-timeout',
      turnId: 'turn-interrupt-timeout',
      turnCompletions: [],
    },
    async ({ rawClientOptions }) => {
      const kernel = await createInMemoryRuntimeKernel({
        adapters: [
          new CodexRuntimeAdapter({
            rawClientOptions,
            interruptCompletionTimeoutMs: 50,
          }),
        ],
        now: () => new Date('2026-07-09T00:00:00.000Z'),
      })
      const startedLog = await kernel.startRun({
        adapter: 'codex',
        prompt: 'Cancel this Codex run',
      })

      await waitForRunLog(kernel, startedLog.runId, (log) =>
        hasCodexDebugClientRequest(log.debugLog, 'turn/start'),
      )

      const cancellingLog = await kernel.cancelRun(startedLog.runId)
      const terminalLog = await kernel.waitForRun(startedLog.runId)

      assert.equal(cancellingLog?.status, 'cancelling')
      assert.equal(terminalLog.status, 'failed')
      assert.equal(
        terminalLog.error,
        'Codex turn interrupt did not complete before timeout',
      )
      assert.deepEqual(
        terminalLog.events.map((event) => event.type),
        ['started', 'cancelling', 'failed'],
      )
      assert.ok(
        hasCodexDebugClientRequest(terminalLog.debugLog, 'turn/interrupt'),
      )
      assert.ok(
        hasCodexInterruptTimeoutDebugEvidence(terminalLog.debugLog, {
          threadId: 'thread-interrupt-timeout',
          turnId: 'turn-interrupt-timeout',
          timeoutMs: 50,
        }),
      )
    },
  )
})

test('CodexRuntimeAdapter rejects invalid interrupt completion timeout', () => {
  assert.throws(
    () =>
      new CodexRuntimeAdapter({
        interruptCompletionTimeoutMs: 0,
      }),
    /interruptCompletionTimeoutMs must be a positive integer/,
  )
})

test('CodexRuntimeAdapter records failed run when cancellation happens before turn scope exists', async () => {
  await withFakeCodexAppServer(
    {
      threadId: 'thread-pre-turn-cancel',
      turnId: 'turn-pre-turn-cancel',
      threadStartHang: true,
    },
    async ({ rawClientOptions }) => {
      const kernel = await createInMemoryRuntimeKernel({
        adapters: [
          new CodexRuntimeAdapter({
            rawClientOptions,
          }),
        ],
        now: () => new Date('2026-07-09T00:00:00.000Z'),
      })
      const startedLog = await kernel.startRun({
        adapter: 'codex',
        prompt: 'Cancel before turn scope exists',
      })

      await waitForRunLog(kernel, startedLog.runId, (log) =>
        hasCodexDebugClientRequest(log.debugLog, 'initialized'),
      )

      const cancellingLog = await kernel.cancelRun(startedLog.runId)
      const terminalLog = await kernel.waitForRun(startedLog.runId)

      assert.equal(cancellingLog?.status, 'cancelling')
      assert.equal(terminalLog.status, 'failed')
      assert.equal(
        terminalLog.error,
        'Codex cancellation requested before turn scope was established; turn/interrupt was not sent',
      )
      assert.deepEqual(
        terminalLog.events.map((event) => event.type),
        ['started', 'cancelling', 'failed'],
      )
      assert.equal(
        hasCodexDebugClientRequest(terminalLog.debugLog, 'turn/interrupt'),
        false,
      )
      assert.ok(
        hasCodexMissingTurnScopeDebugEvidence(terminalLog.debugLog, {
          threadId: null,
        }),
      )
    },
  )
})

test('CodexRuntimeAdapter maps non-retryable error notification to normalized failure', async () => {
  const failedLog = await runCodexScenario({
    threadId: 'thread-error',
    turnId: 'turn-error',
    turnCompletions: [],
    errorNotifications: [
      {
        willRetry: false,
        message: 'Codex error notification failed the turn',
      },
    ],
  })

  assert.equal(failedLog.status, 'failed')
  assert.equal(failedLog.error, 'Codex error notification failed the turn')
  assert.deepEqual(
    failedLog.events.map((event) => event.type),
    ['started', 'failed'],
  )
  assert.ok(hasCodexDebugNotification(failedLog.debugLog, 'error'))
})

test('CodexRuntimeAdapter keeps retryable error notification non-terminal', async () => {
  const completedLog = await runCodexScenario({
    threadId: 'thread-retryable-error',
    turnId: 'turn-retryable-error',
    agentMessageDeltas: [
      {
        delta: 'Recovered after retry',
      },
    ],
    errorNotifications: [
      {
        willRetry: true,
        message: 'Temporary Codex error',
      },
    ],
    turnCompletions: [
      {
        status: 'completed',
      },
    ],
  })

  assert.equal(completedLog.status, 'completed')
  assert.equal(completedLog.output, 'Recovered after retry')
  assert.deepEqual(
    completedLog.events.map((event) => event.type),
    ['started', 'output_delta', 'completed'],
  )
  assert.ok(hasCodexDebugNotification(completedLog.debugLog, 'error'))
})

test('CodexRuntimeAdapter treats interrupted completion without runtime cancel as failure', async () => {
  const failedLog = await runCodexScenario({
    threadId: 'thread-unexpected-interrupt',
    turnId: 'turn-unexpected-interrupt',
    turnCompletions: [
      {
        status: 'interrupted',
      },
    ],
  })

  assert.equal(failedLog.status, 'failed')
  assert.equal(
    failedLog.error,
    'Codex turn interrupted without confirmed runtime cancellation',
  )
  assert.deepEqual(
    failedLog.events.map((event) => event.type),
    ['started', 'failed'],
  )
  assert.ok(
    hasCodexDebugTurnCompletionStatus(failedLog.debugLog, 'interrupted'),
  )
})

test('CodexRuntimeAdapter maps failed turn completion to normalized failure', async () => {
  const failedLog = await runCodexScenario({
    threadId: 'thread-failed-turn',
    turnId: 'turn-failed-turn',
    turnCompletions: [
      {
        status: 'failed',
        errorMessage: 'Codex turn failed for test',
      },
    ],
  })

  assert.equal(failedLog.status, 'failed')
  assert.equal(failedLog.error, 'Codex turn failed for test')
  assert.deepEqual(
    failedLog.events.map((event) => event.type),
    ['started', 'failed'],
  )
  assert.ok(hasCodexDebugTurnCompletionStatus(failedLog.debugLog, 'failed'))
})

test('CodexRuntimeAdapter records failed run when notification stream ends before terminal turn', async () => {
  const failedLog = await runCodexScenario({
    threadId: 'thread-ended',
    turnId: 'turn-ended',
    turnCompletions: [],
    endBeforeTerminal: true,
  })

  assert.equal(failedLog.status, 'failed')
  assert.equal(
    failedLog.error,
    'Codex notification stream ended before terminal turn',
  )
  assert.ok(
    failedLog.debugLog?.some((entry) => entry.kind === 'exit'),
    'expected process exit in debug log',
  )
})

test('CodexRuntimeAdapter records failed run for initialize, thread, and turn start failures', async () => {
  const cases: Array<{
    name: string
    scenario: FakeCodexAppServerScenario
    errorPattern: RegExp
  }> = [
    {
      name: 'initialize response error',
      scenario: {
        initializeError: 'initialize unavailable',
      },
      errorPattern: /initialize returned error: initialize unavailable/,
    },
    {
      name: 'initialize timeout',
      scenario: {
        initializeHang: true,
      },
      errorPattern: /initialize timed out/,
    },
    {
      name: 'initialize early exit',
      scenario: {
        exitAfterInitialize: true,
      },
      errorPattern: /exited before completing pending requests/,
    },
    {
      name: 'thread start response error',
      scenario: {
        threadStartError: 'thread unavailable',
      },
      errorPattern: /thread\/start returned error: thread unavailable/,
    },
    {
      name: 'turn start response error',
      scenario: {
        turnStartError: 'turn unavailable',
      },
      errorPattern: /turn\/start returned error: turn unavailable/,
    },
  ]

  for (const testCase of cases) {
    const failedLog = await runCodexScenario(testCase.scenario)

    assert.equal(failedLog.status, 'failed', testCase.name)
    assert.match(failedLog.error ?? '', testCase.errorPattern, testCase.name)
    assert.ok(
      (failedLog.debugLog?.length ?? 0) > 0,
      `${testCase.name} should retain debug log entries`,
    )
  }
})

test('CodexRuntimeAdapter records failed run for missing Codex binary', async () => {
  const tempDir = await mkdtemp(join(tmpdir(), 'ay-ple-missing-codex-'))

  try {
    const adapter = new CodexRuntimeAdapter({
      rawClientOptions: {
        codexBinPath: join(tempDir, 'missing-codex-binary'),
        cwd: tempDir,
        codexHome: join(tempDir, 'codex-home'),
        codexSqliteHome: join(tempDir, 'sqlite'),
        timeoutMs: 100,
      },
    })
    const kernel = await createInMemoryRuntimeKernel({
      adapters: [adapter],
      now: () => new Date('2026-07-09T00:00:00.000Z'),
    })
    const startedLog = await kernel.startRun({
      adapter: 'codex',
      prompt: 'This cannot spawn',
    })
    const failedLog = await kernel.waitForRun(startedLog.runId)

    assert.equal(failedLog.status, 'failed')
    assert.match(failedLog.error ?? '', /(ENOENT|spawn)/)
    assert.ok(
      failedLog.debugLog?.some((entry) => entry.kind === 'error'),
      'expected process error in debug log',
    )
  } finally {
    await rm(tempDir, { recursive: true, force: true })
  }
})

async function runCodexScenario(
  scenario: FakeCodexAppServerScenario,
): Promise<RuntimeRunLog> {
  let terminalLog: RuntimeRunLog | undefined

  await withFakeCodexAppServer(scenario, async ({ rawClientOptions }) => {
    const kernel = await createInMemoryRuntimeKernel({
      adapters: [
        new CodexRuntimeAdapter({
          rawClientOptions,
        }),
      ],
      now: () => new Date('2026-07-09T00:00:00.000Z'),
    })
    const startedLog = await kernel.startRun({
      adapter: 'codex',
      prompt: 'Exercise Codex failure mapping',
    })

    terminalLog = await kernel.waitForRun(startedLog.runId)
  })

  assert.ok(terminalLog)

  return terminalLog
}

async function waitForRunLog(
  kernel: AgentRuntimeKernel,
  runId: string,
  predicate: (log: RuntimeRunLog) => boolean,
): Promise<RuntimeRunLog> {
  const log = await waitForRuntimeCondition(
    () => kernel.getRunLog(runId),
    (candidate) => candidate !== undefined && predicate(candidate),
    {
      failureMessage: 'expected run log condition was not observed',
    },
  )

  assert.ok(log)

  return log
}
