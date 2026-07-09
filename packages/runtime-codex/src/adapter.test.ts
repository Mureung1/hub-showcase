import assert from 'node:assert/strict'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import {
  AgentRuntimeKernel,
  type RuntimeRunDebugLogEntry,
  type RuntimeRunLog,
} from '@ay-ple/runtime-core'
import {
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
      const kernel = new AgentRuntimeKernel({
        adapters: [adapter],
        now: () => new Date('2026-07-09T00:00:00.000Z'),
      })

      const startedLog = kernel.startRun({
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
      const kernel = new AgentRuntimeKernel({
        adapters: [
          new CodexRuntimeAdapter({
            rawClientOptions,
          }),
        ],
        now: () => new Date('2026-07-09T00:00:00.000Z'),
      })
      const startedLog = kernel.startRun({
        adapter: 'codex',
        prompt: 'Cancel this Codex run',
      })

      await waitForRunLog(kernel, startedLog.runId, (log) =>
        hasClientRequest(log.debugLog, 'turn/start'),
      )

      const cancelledLog = kernel.cancelRun(startedLog.runId)
      const logWithInterrupt = await waitForRunLog(
        kernel,
        startedLog.runId,
        (log) =>
          hasClientRequest(log.debugLog, 'turn/interrupt') &&
          hasTurnCompletionStatus(log.debugLog, 'interrupted'),
      )

      assert.equal(cancelledLog?.status, 'cancelled')
      assert.equal(logWithInterrupt.status, 'cancelled')
      assert.deepEqual(
        logWithInterrupt.events.map((event) => event.type),
        ['started', 'cancelled'],
      )
      assert.deepEqual(readClientRequest(logWithInterrupt.debugLog, 'turn/interrupt')?.params, {
        threadId: 'thread-cancel',
        turnId: 'turn-cancel',
      })
    },
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
  assert.ok(hasTurnCompletionStatus(failedLog.debugLog, 'failed'))
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
    const kernel = new AgentRuntimeKernel({
      adapters: [adapter],
      now: () => new Date('2026-07-09T00:00:00.000Z'),
    })
    const startedLog = kernel.startRun({
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
    const kernel = new AgentRuntimeKernel({
      adapters: [
        new CodexRuntimeAdapter({
          rawClientOptions,
        }),
      ],
      now: () => new Date('2026-07-09T00:00:00.000Z'),
    })
    const startedLog = kernel.startRun({
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
  const deadline = Date.now() + 1000

  while (Date.now() < deadline) {
    const log = kernel.getRunLog(runId)

    if (log && predicate(log)) {
      return log
    }

    await new Promise<void>((resolve) => {
      setImmediate(resolve)
    })
  }

  assert.fail('expected run log condition was not observed')
}

function readClientRequest(
  debugLog: RuntimeRunDebugLogEntry[] | undefined,
  method: string,
): { method?: string; params?: unknown } | undefined {
  return debugLog
    ?.filter((entry) => entry.source === 'client' && entry.kind === 'stdin')
    .map((entry) => JSON.parse(entry.raw ?? '{}') as { method?: string; params?: unknown })
    .find((message) => message.method === method)
}

function hasClientRequest(
  debugLog: RuntimeRunDebugLogEntry[] | undefined,
  method: string,
): boolean {
  return readClientRequest(debugLog, method) !== undefined
}

function hasTurnCompletionStatus(
  debugLog: RuntimeRunDebugLogEntry[] | undefined,
  status: string,
): boolean {
  return (
    debugLog?.some((entry) => {
      if (entry.source !== 'server' || entry.kind !== 'notification') {
        return false
      }

      const params = entry.data?.params

      return (
        entry.data?.method === 'turn/completed' &&
        isRecord(params) &&
        isRecord(params.turn) &&
        params.turn.status === status
      )
    }) ?? false
  )
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}
