import assert from 'node:assert/strict'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'
import {
  isRuntimeRunId,
  type RuntimeRunDebugLogEntry,
  type RuntimeRunLog,
} from '@ay-ple/runtime-core'
import {
  createInMemoryRuntimeKernel,
  waitForRuntimeCondition,
} from '@ay-ple/runtime-core/testing'
import { CodexRuntimeAdapter } from '@ay-ple/runtime-codex'
import {
  hasCodexDebugClientRequest,
  hasCodexDebugTurnCompletionStatus,
  hasCodexInterruptTimeoutDebugEvidence,
  hasCodexMissingTurnScopeDebugEvidence,
  withFakeCodexAppServer,
  type CodexDebugClientRequestMethod,
} from '@ay-ple/runtime-codex/testing'
import { RuntimeRunJsonStore } from './runtime-run-json-store.js'
import {
  resolveRuntimeHistoryDirectory,
  resolveRuntimeHistoryLimits,
} from './server.js'
import { withTestServer } from './testing/test-server.js'

type ServerRunLog = {
  runId: string
  status: string
  events: Array<Record<string, unknown>>
  debugLog?: RuntimeRunDebugLogEntry[]
}

const restartRecoveryError = 'Runtime interrupted by server restart'

test('runtime history default is anchored to the workspace root', () => {
  const workspaceRoot = fileURLToPath(new URL('../../../', import.meta.url))

  assert.equal(
    resolveRuntimeHistoryDirectory({}),
    path.join(workspaceRoot, '.ay-ple', 'runtime-harness', 'runs'),
  )
})

test('runtime history limits use production defaults and positive safe integer environment overrides', () => {
  assert.deepEqual(resolveRuntimeHistoryLimits({}), {
    maxBytes: 104_857_600,
    maxRuns: 100,
  })
  assert.deepEqual(
    resolveRuntimeHistoryLimits({
      RUNTIME_HISTORY_MAX_BYTES: '4096',
      RUNTIME_HISTORY_MAX_RUNS: '7',
    }),
    {
      maxBytes: 4096,
      maxRuns: 7,
    },
  )

  for (const [name, value] of [
    ['RUNTIME_HISTORY_MAX_RUNS', '0'],
    ['RUNTIME_HISTORY_MAX_RUNS', '-1'],
    ['RUNTIME_HISTORY_MAX_RUNS', '1.5'],
    ['RUNTIME_HISTORY_MAX_RUNS', 'not-a-number'],
    ['RUNTIME_HISTORY_MAX_RUNS', '9007199254740992'],
    ['RUNTIME_HISTORY_MAX_BYTES', '0'],
    ['RUNTIME_HISTORY_MAX_BYTES', '-1'],
    ['RUNTIME_HISTORY_MAX_BYTES', '1.5'],
    ['RUNTIME_HISTORY_MAX_BYTES', 'not-a-number'],
    ['RUNTIME_HISTORY_MAX_BYTES', '9007199254740992'],
  ] as const) {
    assert.throws(
      () => resolveRuntimeHistoryLimits({ [name]: value }),
      new RegExp(`${name} must be a positive safe integer`),
    )
  }
})

test('runtime API starts a fake run and streams normalized events', async () => {
  await withTestServer({ fakeDelayMs: 0 }, async (baseUrl) => {
    const adaptersResponse = await fetch(`${baseUrl}/api/runtime/adapters`)
    const adapters = await adaptersResponse.json()

    assert.equal(adaptersResponse.status, 200)
    assert.deepEqual(adapters, {
      adapters: [
        {
          description: 'Deterministic local adapter for Runtime Inspector development',
          label: 'Fake Runtime',
          name: 'fake',
        },
        {
          description: 'Codex app-server adapter for Runtime Inspector parity',
          label: 'Codex Runtime',
          name: 'codex',
        },
      ],
    })

    const startResponse = await fetch(`${baseUrl}/api/runtime/runs`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        adapter: 'fake',
        prompt: '정리해줘',
      }),
    })
    const startedRun = (await startResponse.json()) as { runId: string }

    assert.equal(startResponse.status, 201)
    assert.equal(isRuntimeRunId(startedRun.runId), true)

    const eventsResponse = await fetch(
      `${baseUrl}/api/runtime/runs/${startedRun.runId}/events?after=0`,
    )
    const streamedEvents = parseSseData(await eventsResponse.text())

    assert.equal(eventsResponse.status, 200)
    assert.deepEqual(
      streamedEvents.map((event) => event.type),
      ['started', 'output_delta', 'output_delta', 'completed'],
    )
    assert.equal(streamedEvents[0]?.prompt, '정리해줘')
    assert.equal(
      streamedEvents[1]?.delta,
      'Fake runtime received: "정리해줘".\n',
    )
    assert.equal(
      streamedEvents[3]?.output,
      'Fake runtime received: "정리해줘".\nThis deterministic response proves the inspector can observe a run end to end.',
    )

    const historyResponse = await fetch(`${baseUrl}/api/runtime/runs`)
    const history = await historyResponse.json()

    assert.equal(historyResponse.status, 200)
    assert.equal(history.runs.length, 1)
    assert.equal(history.runs[0].runId, startedRun.runId)
    assert.equal(history.runs[0].status, 'completed')

    const logResponse = await fetch(
      `${baseUrl}/api/runtime/runs/${startedRun.runId}`,
    )
    const log = await logResponse.json()

    assert.equal(logResponse.status, 200)
    assert.equal(log.run.runId, startedRun.runId)
    assert.equal(log.run.status, 'completed')
    assert.equal(log.run.events.length, 4)
  })
})

test('runtime API hydrates completed history after a server restart', async () => {
  const temporaryRoot = await mkdtemp(
    path.join(tmpdir(), 'ay-ple-server-restart-test-'),
  )
  const runtimeHistoryDirectory = path.join(temporaryRoot, 'runs')

  try {
    let completedLog: RuntimeRunLog | undefined

    await withTestServer(
      { fakeDelayMs: 0, runtimeHistoryDirectory },
      async (baseUrl) => {
        const runId = await startRuntimeRun(baseUrl, {
          adapter: 'fake',
          prompt: 'survive restart',
        })

        await collectRunEvents(baseUrl, runId)

        const response = await fetch(`${baseUrl}/api/runtime/runs/${runId}`)
        const body = (await response.json()) as { run: RuntimeRunLog }

        assert.equal(response.status, 200)
        assert.equal(body.run.status, 'completed')
        assert.ok(body.run.debugLog?.length)
        completedLog = body.run
      },
    )

    assert.ok(completedLog)

    await withTestServer(
      { fakeDelayMs: 0, runtimeHistoryDirectory },
      async (baseUrl) => {
        const healthResponse = await fetch(`${baseUrl}/api/health`)
        const historyResponse = await fetch(`${baseUrl}/api/runtime/runs`)
        const historyBody = (await historyResponse.json()) as {
          runs: Array<{ runId: string; status: string }>
        }
        const logResponse = await fetch(
          `${baseUrl}/api/runtime/runs/${completedLog.runId}`,
        )
        const logBody = (await logResponse.json()) as { run: RuntimeRunLog }

        assert.equal(healthResponse.status, 200)
        assert.deepEqual(historyBody.runs, [
          {
            adapter: completedLog.adapter,
            completedAt: completedLog.completedAt,
            outputPreview:
              'Fake runtime received: "survive restart". This deterministic response proves the inspector can observe a run end to end.',
            prompt: completedLog.prompt,
            runId: completedLog.runId,
            startedAt: completedLog.startedAt,
            status: 'completed',
          },
        ])
        assert.deepEqual(logBody.run, completedLog)
      },
    )
  } finally {
    await rm(temporaryRoot, { force: true, recursive: true })
  }
})

test('runtime API recovers persisted running and cancelling history before readiness', async () => {
  const temporaryRoot = await mkdtemp(
    path.join(tmpdir(), 'ay-ple-server-interrupted-recovery-test-'),
  )
  const runtimeHistoryDirectory = path.join(temporaryRoot, 'runs')
  const interruptedLogs = createInterruptedRunLogs()
  const recoveredLogs = new Map<string, RuntimeRunLog>()

  try {
    const seedStore = new RuntimeRunJsonStore({
      directory: runtimeHistoryDirectory,
    })

    for (const interruptedLog of interruptedLogs) {
      await seedStore.save(interruptedLog)
    }

    await withTestServer(
      { fakeDelayMs: 0, runtimeHistoryDirectory },
      async (baseUrl) => {
        const healthResponse = await fetch(`${baseUrl}/api/health`)
        const historyResponse = await fetch(`${baseUrl}/api/runtime/runs`)
        const historyBody = (await historyResponse.json()) as {
          runs: Array<{
            error?: string
            runId: string
            status: string
          }>
        }

        assert.equal(healthResponse.status, 200)
        assert.equal(historyResponse.status, 200)
        assert.deepEqual(
          historyBody.runs.map((run) => run.runId).sort(),
          interruptedLogs.map((run) => run.runId).sort(),
        )
        assert.equal(
          historyBody.runs.some(
            (run) => run.status === 'running' || run.status === 'cancelling',
          ),
          false,
        )

        for (const interruptedLog of interruptedLogs) {
          const summary = historyBody.runs.find(
            (run) => run.runId === interruptedLog.runId,
          )
          const logResponse = await fetch(
            `${baseUrl}/api/runtime/runs/${interruptedLog.runId}`,
          )
          const logBody = (await logResponse.json()) as { run: RuntimeRunLog }
          const recoveredLog = logBody.run
          const failedEvent = recoveredLog.events.at(-1)
          const recoveryDebugEntry = recoveredLog.debugLog?.at(-1)

          assert.equal(summary?.status, 'failed')
          assert.equal(summary?.error, restartRecoveryError)
          assert.equal(logResponse.status, 200)
          assert.equal(recoveredLog.status, 'failed')
          assert.equal(recoveredLog.error, restartRecoveryError)
          assert.equal(recoveredLog.prompt, interruptedLog.prompt)
          assert.equal(recoveredLog.output, interruptedLog.output)
          assert.deepEqual(
            recoveredLog.events.slice(0, interruptedLog.events.length),
            interruptedLog.events,
          )
          assert.deepEqual(
            recoveredLog.debugLog?.slice(
              0,
              interruptedLog.debugLog?.length,
            ),
            interruptedLog.debugLog,
          )
          assert.ok(recoveredLog.completedAt)
          assert.deepEqual(failedEvent, {
            type: 'failed',
            sequence: interruptedLog.events.length + 1,
            runId: interruptedLog.runId,
            adapter: interruptedLog.adapter,
            timestamp: recoveredLog.completedAt,
            error: restartRecoveryError,
          })
          assert.deepEqual(recoveryDebugEntry, {
            timestamp: recoveredLog.completedAt,
            source: 'kernel',
            kind: 'restart_recovery',
            message: restartRecoveryError,
            data: {
              previousStatus: interruptedLog.status,
              recoveryReason: restartRecoveryError,
            },
          })
          assert.equal(
            recoveredLog.debugLog?.length,
            (interruptedLog.debugLog?.length ?? 0) + 1,
          )

          recoveredLogs.set(recoveredLog.runId, recoveredLog)
        }
      },
    )

    const persistedLogs = await new RuntimeRunJsonStore({
      directory: runtimeHistoryDirectory,
    }).load()

    assert.equal(persistedLogs.length, interruptedLogs.length)
    assert.equal(
      persistedLogs.some(
        (run) => run.status === 'running' || run.status === 'cancelling',
      ),
      false,
    )

    for (const persistedLog of persistedLogs) {
      assert.deepEqual(persistedLog, recoveredLogs.get(persistedLog.runId))
    }
  } finally {
    await rm(temporaryRoot, { force: true, recursive: true })
  }
})

test('runtime API applies configured retention after startup hydration', async () => {
  const temporaryRoot = await mkdtemp(
    path.join(tmpdir(), 'ay-ple-server-startup-retention-test-'),
  )
  const runtimeHistoryDirectory = path.join(temporaryRoot, 'runs')
  const oldRun = createCompletedRunLog({
    runId: '11111111-1111-4111-8111-111111111111',
    prompt: 'prune on startup',
    startedAt: '2026-07-10T01:00:00.000Z',
    completedAt: '2026-07-10T01:01:00.000Z',
  })
  const newRun = createCompletedRunLog({
    runId: '22222222-2222-4222-8222-222222222222',
    prompt: 'keep on startup',
    startedAt: '2026-07-10T02:00:00.000Z',
    completedAt: '2026-07-10T02:01:00.000Z',
  })

  try {
    const seedStore = new RuntimeRunJsonStore({
      directory: runtimeHistoryDirectory,
    })
    await seedStore.save(oldRun)
    await seedStore.save(newRun)

    await withTestServer(
      {
        fakeDelayMs: 0,
        runtimeHistoryDirectory,
        runtimeHistoryMaxBytes: 1_000_000,
        runtimeHistoryMaxRuns: 1,
      },
      async (baseUrl) => {
        const historyResponse = await fetch(`${baseUrl}/api/runtime/runs`)
        const history = (await historyResponse.json()) as {
          runs: Array<{ runId: string }>
        }

        assert.equal(historyResponse.status, 200)
        assert.deepEqual(history.runs.map((run) => run.runId), [newRun.runId])
        assert.equal(
          (await fetch(`${baseUrl}/api/runtime/runs/${oldRun.runId}`)).status,
          404,
        )
      },
    )

    assert.deepEqual(
      (
        await new RuntimeRunJsonStore({
          directory: runtimeHistoryDirectory,
        }).load()
      ).map((run) => run.runId),
      [newRun.runId],
    )
  } finally {
    await rm(temporaryRoot, { force: true, recursive: true })
  }
})

test('runtime API synchronizes recovery-triggered retention between disk and memory before readiness', async () => {
  const temporaryRoot = await mkdtemp(
    path.join(tmpdir(), 'ay-ple-server-recovery-retention-test-'),
  )
  const runtimeHistoryDirectory = path.join(temporaryRoot, 'runs')
  const oldRun = createCompletedRunLog({
    runId: '11111111-1111-4111-8111-111111111111',
    prompt: 'prune after recovery',
    startedAt: '2026-07-10T01:00:00.000Z',
    completedAt: '2026-07-10T01:01:00.000Z',
  })
  const interruptedRun = createInterruptedRunLogs()[0]

  try {
    const seedStore = new RuntimeRunJsonStore({
      directory: runtimeHistoryDirectory,
    })
    await seedStore.save(oldRun)
    await seedStore.save(interruptedRun)

    await withTestServer(
      {
        fakeDelayMs: 0,
        runtimeHistoryDirectory,
        runtimeHistoryMaxBytes: 1_000_000,
        runtimeHistoryMaxRuns: 1,
      },
      async (baseUrl) => {
        const historyResponse = await fetch(`${baseUrl}/api/runtime/runs`)
        const history = (await historyResponse.json()) as {
          runs: Array<{ runId: string; status: string }>
        }

        assert.equal(historyResponse.status, 200)
        assert.deepEqual(
          history.runs.map((run) => ({
            runId: run.runId,
            status: run.status,
          })),
          [{ runId: interruptedRun.runId, status: 'failed' }],
        )
        assert.equal(
          (await fetch(`${baseUrl}/api/runtime/runs/${oldRun.runId}`)).status,
          404,
        )
      },
    )

    const persistedLogs = await new RuntimeRunJsonStore({
      directory: runtimeHistoryDirectory,
    }).load()

    assert.equal(persistedLogs.length, 1)
    assert.equal(persistedLogs[0]?.runId, interruptedRun.runId)
    assert.equal(persistedLogs[0]?.status, 'failed')
  } finally {
    await rm(temporaryRoot, { force: true, recursive: true })
  }
})

test('runtime API clears terminal history without interrupting an active run or its SSE stream', async () => {
  await withTestServer({ fakeDelayMs: 150 }, async (baseUrl) => {
    const terminalRunId = await startRuntimeRun(baseUrl, {
      adapter: 'fake',
      prompt: 'clear this terminal run',
    })
    await collectRunEvents(baseUrl, terminalRunId)

    const activeRunId = await startRuntimeRun(baseUrl, {
      adapter: 'fake',
      prompt: 'keep this active run',
    })
    const activeEventsPromise = collectRunEvents(baseUrl, activeRunId)
    const clearResponse = await fetch(`${baseUrl}/api/runtime/runs`, {
      method: 'DELETE',
    })
    const clearBody = (await clearResponse.json()) as {
      clearedRunIds: string[]
    }

    assert.equal(clearResponse.status, 200)
    assert.deepEqual(clearBody, { clearedRunIds: [terminalRunId] })

    const activeLogResponse = await fetch(
      `${baseUrl}/api/runtime/runs/${activeRunId}`,
    )
    const activeLogBody = (await activeLogResponse.json()) as {
      run: RuntimeRunLog
    }

    assert.equal(activeLogResponse.status, 200)
    assert.equal(activeLogBody.run.status, 'running')
    assert.equal(activeLogBody.run.prompt, 'keep this active run')
    assert.deepEqual(
      activeLogBody.run.events.map((event) => event.type),
      ['started'],
    )

    const activeEvents = await activeEventsPromise

    assert.deepEqual(
      activeEvents.map((event) => event.type),
      ['started', 'output_delta', 'output_delta', 'completed'],
    )
    assert.match(String(activeEvents[1]?.delta), /keep this active run/)

    const finalClearResponse = await fetch(`${baseUrl}/api/runtime/runs`, {
      method: 'DELETE',
    })
    const finalClearBody = await finalClearResponse.json()

    assert.equal(finalClearResponse.status, 200)
    assert.deepEqual(finalClearBody, { clearedRunIds: [activeRunId] })
    assert.deepEqual(
      await (await fetch(`${baseUrl}/api/runtime/runs`)).json(),
      { runs: [] },
    )
  })
})

test('runtime API exposes Codex capability slots as engine inspection metadata', async () => {
  await withTestServer({}, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/runtime/codex/capabilities`)
    const body = (await response.json()) as {
      slots: Array<{
        id: string
        methods: string[]
        productized: boolean
      }>
    }

    assert.equal(response.status, 200)
    assert.ok(body.slots.length >= 7)
    assert.ok(body.slots.every((slot) => slot.productized === false))

    for (const method of [
      'turn/steer',
      'thread/list',
      'thread/loaded/list',
      'thread/read',
      'thread/approveGuardianDeniedAction',
      'permissionProfile/list',
      'thread/inject_items',
      'account/read',
    ]) {
      assert.ok(
        body.slots.some((slot) => slot.methods.includes(method)),
        `expected capability endpoint to include ${method}`,
      )
    }
  })
})

test('runtime API exposes Codex binary, runtime home, and auth status', async () => {
  await withFakeCodexAppServer(
    {
      userAgent: 'fake-codex-status-test',
      authStatus: {
        authMethod: 'chatgpt',
        authToken: 'hidden-token',
        requiresOpenaiAuth: true,
      },
    },
    async ({ rawClientOptions }) => {
      await withTestServer(
        {
          codexRawClientOptions: {
            ...rawClientOptions,
            ensureFileAuthConfig: true,
          },
        },
        async (baseUrl) => {
          const response = await fetch(`${baseUrl}/api/runtime/codex/status`)
          const body = await response.json()

          assert.equal(response.status, 200)
          assert.equal(body.ok, true)
          assert.equal(body.codexBinPath, process.execPath)
          assert.match(body.version, /^v\d+\./)
          assert.equal(body.pinnedVersion, '0.144.0')
          assert.equal(body.versionMatchesPin, false)
          assert.equal(body.cwd, rawClientOptions.cwd)
          assert.deepEqual(body.runtimeHome, {
            codexHome: rawClientOptions.codexHome,
            codexSqliteHome: rawClientOptions.codexSqliteHome,
          })
          assert.equal(body.config.authCredentialsStore, 'file')
          assert.equal(body.config.fileAuthConfigPresent, true)
          assert.equal(body.initialize.userAgent, 'fake-codex-status-test')
          assert.deepEqual(body.auth, {
            authMethod: 'chatgpt',
            requiresOpenaiAuth: true,
          })
          assert.equal('authToken' in body.auth, false)
        },
      )
    },
  )
})

test('runtime API cancels a running fake run and streams normalized cancellation', async () => {
  await withTestServer({ fakeDelayMs: 1000 }, async (baseUrl) => {
    const startResponse = await fetch(`${baseUrl}/api/runtime/runs`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        adapter: 'fake',
        prompt: '멈춰줘',
      }),
    })
    const startedRun = (await startResponse.json()) as { runId: string }

    assert.equal(startResponse.status, 201)

    const eventsPromise = fetch(
      `${baseUrl}/api/runtime/runs/${startedRun.runId}/events?after=0`,
    ).then(async (eventsResponse) => {
      assert.equal(eventsResponse.status, 200)
      return parseSseData(await eventsResponse.text())
    })

    const cancelResponse = await fetch(
      `${baseUrl}/api/runtime/runs/${startedRun.runId}/cancel`,
      {
        method: 'POST',
      },
    )
    const cancelledRun = await cancelResponse.json()
    const streamedEvents = await eventsPromise

    assert.equal(cancelResponse.status, 200)
    assert.equal(cancelledRun.run.status, 'cancelled')
    assert.deepEqual(
      streamedEvents.map((event) => event.type),
      ['started', 'cancelled'],
    )
    assert.equal(streamedEvents[1]?.reason, 'Runtime run cancelled')

    const historyResponse = await fetch(`${baseUrl}/api/runtime/runs`)
    const history = await historyResponse.json()

    assert.equal(historyResponse.status, 200)
    assert.equal(history.runs[0].runId, startedRun.runId)
    assert.equal(history.runs[0].status, 'cancelled')

    const logResponse = await fetch(
      `${baseUrl}/api/runtime/runs/${startedRun.runId}`,
    )
    const log = await logResponse.json()

    assert.equal(logResponse.status, 200)
    assert.equal(log.run.status, 'cancelled')
    assert.deepEqual(
      log.run.events.map((event: Record<string, unknown>) => event.type),
      ['started', 'cancelled'],
    )
  })
})

test('runtime API records deterministic fake failure in stream, log, and history', async () => {
  await withTestServer({ fakeDelayMs: 0 }, async (baseUrl) => {
    const startResponse = await fetch(`${baseUrl}/api/runtime/runs`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        adapter: 'fake',
        prompt: '실패해줘',
        fakeScenario: 'failure',
      }),
    })
    const startedRun = (await startResponse.json()) as { runId: string }

    assert.equal(startResponse.status, 201)

    const eventsResponse = await fetch(
      `${baseUrl}/api/runtime/runs/${startedRun.runId}/events?after=0`,
    )
    const streamedEvents = parseSseData(await eventsResponse.text())

    assert.equal(eventsResponse.status, 200)
    assert.deepEqual(
      streamedEvents.map((event) => event.type),
      ['started', 'failed'],
    )
    assert.equal(
      streamedEvents[1]?.error,
      'Fake runtime deterministic failure requested',
    )

    const historyResponse = await fetch(`${baseUrl}/api/runtime/runs`)
    const history = await historyResponse.json()

    assert.equal(historyResponse.status, 200)
    assert.equal(history.runs[0].runId, startedRun.runId)
    assert.equal(history.runs[0].status, 'failed')
    assert.equal(
      history.runs[0].error,
      'Fake runtime deterministic failure requested',
    )

    const logResponse = await fetch(
      `${baseUrl}/api/runtime/runs/${startedRun.runId}`,
    )
    const log = await logResponse.json()

    assert.equal(logResponse.status, 200)
    assert.equal(log.run.status, 'failed')
    assert.equal(log.run.error, 'Fake runtime deterministic failure requested')
  })
})

test('runtime API streams a codex adapter run through normalized events and log', async () => {
  await withFakeCodexAppServer(
    {
      userAgent: 'fake-codex-server-test',
      threadId: 'thread-server-test',
      turnId: 'turn-server-test',
      agentMessageDeltas: [
        {
          itemId: 'item-server-test',
          delta: 'Codex server path output',
        },
      ],
    },
    async ({ rawClientOptions }) => {
      const kernel = await createInMemoryRuntimeKernel({
        adapters: [
          new CodexRuntimeAdapter({
            rawClientOptions,
          }),
        ],
      })

      await withTestServer({ kernel }, async (baseUrl) => {
        const startResponse = await fetch(`${baseUrl}/api/runtime/runs`, {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
          },
          body: JSON.stringify({
            adapter: 'codex',
            prompt: 'Compare adapters',
          }),
        })
        const startedRun = (await startResponse.json()) as { runId: string }

        assert.equal(startResponse.status, 201)

        const eventsResponse = await fetch(
          `${baseUrl}/api/runtime/runs/${startedRun.runId}/events?after=0`,
        )
        const streamedEvents = parseSseData(await eventsResponse.text())

        assert.equal(eventsResponse.status, 200)
        assert.deepEqual(
          streamedEvents.map((event) => event.type),
          ['started', 'output_delta', 'completed'],
        )
        assert.equal(streamedEvents[1]?.delta, 'Codex server path output')
        assert.equal(streamedEvents[2]?.output, 'Codex server path output')

        const logResponse = await fetch(
          `${baseUrl}/api/runtime/runs/${startedRun.runId}`,
        )
        const log = await logResponse.json()

        assert.equal(logResponse.status, 200)
        assert.equal(log.run.status, 'completed')
        assert.equal(log.run.output, 'Codex server path output')
        assert.ok(
          log.run.debugLog.some(
            (entry: Record<string, unknown>) =>
              entry.source === 'server' && entry.kind === 'notification',
          ),
        )
      })
    },
  )
})

test('runtime API cancels a codex run through normalized cancellation', async () => {
  await withFakeCodexAppServer(
    {
      threadId: 'thread-server-cancel',
      turnId: 'turn-server-cancel',
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
      })

      await withTestServer({ kernel }, async (baseUrl) => {
        const { runId, streamedEventsPromise } =
          await startCodexRunAndCancel(baseUrl, {
            prompt: 'Cancel from server API',
            waitForDebugMethod: 'turn/start',
          })

        const log = await waitForServerRunLog(
          baseUrl,
          runId,
          (run) =>
            hasCodexDebugClientRequest(run.debugLog, 'turn/interrupt') &&
            hasCodexDebugTurnCompletionStatus(run.debugLog, 'interrupted'),
        )
        const streamedEvents = await streamedEventsPromise

        assert.equal(log.status, 'cancelled')
        assert.deepEqual(
          log.events.map((event: Record<string, unknown>) => event.type),
          ['started', 'cancelling', 'cancelled'],
        )
        assert.deepEqual(
          streamedEvents.map((event) => event.type),
          ['started', 'cancelling', 'cancelled'],
        )

        await assertLatestHistoryStatus(baseUrl, runId, 'cancelled', {
          noRunningResidue: true,
        })
      })
    },
  )
})

test('runtime API records codex interrupt failure as normalized failure', async () => {
  await withFakeCodexAppServer(
    {
      threadId: 'thread-server-interrupt-error',
      turnId: 'turn-server-interrupt-error',
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
      })

      await withTestServer({ kernel }, async (baseUrl) => {
        const { runId, streamedEventsPromise } =
          await startCodexRunAndCancel(baseUrl, {
            prompt: 'Cancel from server API',
            waitForDebugMethod: 'turn/start',
          })
        const terminalLog = await waitForServerRunLog(
          baseUrl,
          runId,
          (run) => run.status === 'failed',
        )
        const streamedEvents = await streamedEventsPromise

        assert.equal(terminalLog.status, 'failed')
        assert.match(
          terminalLog.error ?? '',
          /Codex turn interrupt failed: turn\/interrupt returned error: interrupt unavailable/,
        )
        assert.deepEqual(
          terminalLog.events.map((event: Record<string, unknown>) => event.type),
          ['started', 'cancelling', 'failed'],
        )
        assert.deepEqual(
          streamedEvents.map((event) => event.type),
          ['started', 'cancelling', 'failed'],
        )

        await assertLatestHistoryStatus(baseUrl, runId, 'failed')
      })
    },
  )
})

test('runtime API records codex interrupt timeout as normalized failure', async () => {
  await withFakeCodexAppServer(
    {
      threadId: 'thread-server-interrupt-timeout',
      turnId: 'turn-server-interrupt-timeout',
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
      })

      await withTestServer({ kernel }, async (baseUrl) => {
        const { runId, streamedEventsPromise } =
          await startCodexRunAndCancel(baseUrl, {
            prompt: 'Cancel from server API',
            waitForDebugMethod: 'turn/start',
          })
        const terminalLog = await waitForServerRunLog(
          baseUrl,
          runId,
          (run) => run.status === 'failed',
        )
        const streamedEvents = await streamedEventsPromise

        assert.equal(terminalLog.status, 'failed')
        assert.equal(
          terminalLog.error,
          'Codex turn interrupt did not complete before timeout',
        )
        assert.ok(
          hasCodexInterruptTimeoutDebugEvidence(terminalLog.debugLog, {
            threadId: 'thread-server-interrupt-timeout',
            turnId: 'turn-server-interrupt-timeout',
            timeoutMs: 50,
          }),
        )
        assert.deepEqual(
          streamedEvents.map((event) => event.type),
          ['started', 'cancelling', 'failed'],
        )

        await assertLatestHistoryStatus(baseUrl, runId, 'failed', {
          noRunningResidue: true,
        })
      })
    },
  )
})

test('runtime API records codex pre-turn-scope cancellation as normalized failure', async () => {
  await withFakeCodexAppServer(
    {
      threadId: 'thread-server-pre-turn-cancel',
      turnId: 'turn-server-pre-turn-cancel',
      threadStartHang: true,
    },
    async ({ rawClientOptions }) => {
      const kernel = await createInMemoryRuntimeKernel({
        adapters: [
          new CodexRuntimeAdapter({
            rawClientOptions,
          }),
        ],
      })

      await withTestServer({ kernel }, async (baseUrl) => {
        const { runId, streamedEventsPromise } =
          await startCodexRunAndCancel(baseUrl, {
            prompt: 'Cancel before turn scope exists',
            waitForDebugMethod: 'initialized',
          })
        const terminalLog = await waitForServerRunLog(
          baseUrl,
          runId,
          (run) => run.status === 'failed',
        )
        const streamedEvents = await streamedEventsPromise

        assert.equal(terminalLog.status, 'failed')
        assert.equal(
          terminalLog.error,
          'Codex cancellation requested before turn scope was established; turn/interrupt was not sent',
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
        assert.deepEqual(
          streamedEvents.map((event) => event.type),
          ['started', 'cancelling', 'failed'],
        )

        await assertLatestHistoryStatus(baseUrl, runId, 'failed', {
          noRunningResidue: true,
        })
      })
    },
  )
})

async function startCodexRunAndCancel(
  baseUrl: string,
  input: {
    prompt: string
    waitForDebugMethod: CodexDebugClientRequestMethod
  },
): Promise<{
  runId: string
  streamedEventsPromise: Promise<Array<Record<string, unknown>>>
}> {
  const runId = await startRuntimeRun(baseUrl, {
    adapter: 'codex',
    prompt: input.prompt,
  })

  await waitForServerRunLog(baseUrl, runId, (run) =>
    hasCodexDebugClientRequest(run.debugLog, input.waitForDebugMethod),
  )

  const streamedEventsPromise = collectRunEvents(baseUrl, runId)
  const cancellingRun = await cancelRuntimeRun(baseUrl, runId)

  assert.equal(cancellingRun.status, 'cancelling')

  return {
    runId,
    streamedEventsPromise,
  }
}

async function startRuntimeRun(
  baseUrl: string,
  input: Record<string, unknown>,
): Promise<string> {
  const startResponse = await fetch(`${baseUrl}/api/runtime/runs`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify(input),
  })
  const startedRun = (await startResponse.json()) as { runId: string }

  assert.equal(startResponse.status, 201)

  return startedRun.runId
}

async function collectRunEvents(
  baseUrl: string,
  runId: string,
): Promise<Array<Record<string, unknown>>> {
  const eventsResponse = await fetch(
    `${baseUrl}/api/runtime/runs/${runId}/events?after=0`,
  )

  assert.equal(eventsResponse.status, 200)

  return parseSseData(await eventsResponse.text())
}

async function cancelRuntimeRun(
  baseUrl: string,
  runId: string,
): Promise<ServerRunLog> {
  const cancelResponse = await fetch(
    `${baseUrl}/api/runtime/runs/${runId}/cancel`,
    {
      method: 'POST',
    },
  )
  const cancelBody = (await cancelResponse.json()) as { run: ServerRunLog }

  assert.equal(cancelResponse.status, 200)

  return cancelBody.run
}

async function assertLatestHistoryStatus(
  baseUrl: string,
  runId: string,
  status: string,
  options: { noRunningResidue?: boolean } = {},
): Promise<void> {
  const historyResponse = await fetch(`${baseUrl}/api/runtime/runs`)
  const history = (await historyResponse.json()) as {
    runs: Array<Record<string, unknown>>
  }

  assert.equal(historyResponse.status, 200)
  assert.equal(history.runs[0]?.runId, runId)
  assert.equal(history.runs[0]?.status, status)

  if (options.noRunningResidue) {
    assert.equal(
      history.runs.some(
        (run) => run.runId === runId && run.status === 'running',
      ),
      false,
    )
  }
}

function parseSseData(stream: string): Array<Record<string, unknown>> {
  return stream
    .split('\n')
    .filter((line) => line.startsWith('data: '))
    .map((line) => JSON.parse(line.slice('data: '.length)))
}

async function waitForServerRunLog(
  baseUrl: string,
  runId: string,
  predicate: (run: ServerRunLog) => boolean,
): Promise<ServerRunLog> {
  return waitForRuntimeCondition(
    async () => {
      const response = await fetch(`${baseUrl}/api/runtime/runs/${runId}`)
      const data = await response.json()

      return data.run as ServerRunLog
    },
    predicate,
    {
      failureMessage: 'expected server run log condition was not observed',
    },
  )
}

function createInterruptedRunLogs(): RuntimeRunLog[] {
  const runningRunId = '44444444-4444-4444-8444-444444444444'
  const cancellingRunId = '55555555-5555-4555-8555-555555555555'

  return [
    {
      runId: runningRunId,
      adapter: 'fake',
      prompt: 'recover a running snapshot',
      status: 'running',
      output: 'partial running transcript',
      events: [
        {
          type: 'started',
          sequence: 1,
          runId: runningRunId,
          adapter: 'fake',
          timestamp: '2026-07-10T03:00:00.000Z',
          prompt: 'recover a running snapshot',
        },
        {
          type: 'output_delta',
          sequence: 2,
          runId: runningRunId,
          adapter: 'fake',
          timestamp: '2026-07-10T03:00:01.000Z',
          delta: 'partial running transcript',
        },
      ],
      debugLog: [
        {
          timestamp: '2026-07-10T03:00:01.000Z',
          source: 'fake-runtime',
          kind: 'stream_checkpoint',
          message: 'running evidence before restart',
          data: { chunk: 1 },
        },
      ],
      startedAt: '2026-07-10T03:00:00.000Z',
    },
    {
      runId: cancellingRunId,
      adapter: 'fake',
      prompt: 'recover a cancelling snapshot',
      status: 'cancelling',
      output: 'partial before cancel and after request',
      events: [
        {
          type: 'started',
          sequence: 1,
          runId: cancellingRunId,
          adapter: 'fake',
          timestamp: '2026-07-10T03:01:00.000Z',
          prompt: 'recover a cancelling snapshot',
        },
        {
          type: 'output_delta',
          sequence: 2,
          runId: cancellingRunId,
          adapter: 'fake',
          timestamp: '2026-07-10T03:01:01.000Z',
          delta: 'partial before cancel',
        },
        {
          type: 'cancelling',
          sequence: 3,
          runId: cancellingRunId,
          adapter: 'fake',
          timestamp: '2026-07-10T03:01:02.000Z',
          reason: 'Runtime run cancellation requested',
        },
        {
          type: 'output_delta',
          sequence: 4,
          runId: cancellingRunId,
          adapter: 'fake',
          timestamp: '2026-07-10T03:01:03.000Z',
          delta: ' and after request',
        },
      ],
      debugLog: [
        {
          timestamp: '2026-07-10T03:01:01.000Z',
          source: 'fake-runtime',
          kind: 'stream_checkpoint',
          message: 'cancelling evidence before restart',
          data: { chunk: 1 },
        },
        {
          timestamp: '2026-07-10T03:01:03.000Z',
          source: 'fake-runtime',
          kind: 'stream_checkpoint',
          message: 'cancelling evidence after request',
          data: { chunk: 2 },
        },
      ],
      startedAt: '2026-07-10T03:01:00.000Z',
    },
  ]
}

function createCompletedRunLog(input: {
  completedAt: string
  prompt: string
  runId: string
  startedAt: string
}): RuntimeRunLog {
  const output = `completed: ${input.prompt}`

  return {
    runId: input.runId,
    adapter: 'fake',
    prompt: input.prompt,
    status: 'completed',
    output,
    events: [
      {
        type: 'started',
        sequence: 1,
        runId: input.runId,
        adapter: 'fake',
        timestamp: input.startedAt,
        prompt: input.prompt,
      },
      {
        type: 'completed',
        sequence: 2,
        runId: input.runId,
        adapter: 'fake',
        timestamp: input.completedAt,
        output,
      },
    ],
    startedAt: input.startedAt,
    completedAt: input.completedAt,
  }
}
