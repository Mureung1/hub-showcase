import assert from 'node:assert/strict'
import test from 'node:test'
import {
  AgentRuntimeKernel,
  type RuntimeRunDebugLogEntry,
} from '@ay-ple/runtime-core'
import { waitForRuntimeCondition } from '@ay-ple/runtime-core/testing'
import { CodexRuntimeAdapter } from '@ay-ple/runtime-codex'
import {
  hasCodexAdapterDebugEntry,
  hasCodexDebugClientRequest,
  hasCodexDebugTurnCompletionStatus,
  withFakeCodexAppServer,
} from '@ay-ple/runtime-codex/testing'
import { createServerApp } from './server.js'

type ServerRunLog = {
  runId: string
  status: string
  events: Array<Record<string, unknown>>
  debugLog?: RuntimeRunDebugLogEntry[]
}

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
    assert.match(startedRun.runId, /^run-\d{4}$/)

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
      const kernel = new AgentRuntimeKernel({
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
      const kernel = new AgentRuntimeKernel({
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
      const kernel = new AgentRuntimeKernel({
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
      const kernel = new AgentRuntimeKernel({
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
        assert.equal(
          terminalLog.error,
          'Codex turn interrupt did not complete before timeout',
        )
        assert.ok(
          hasCodexAdapterDebugEntry(terminalLog.debugLog, {
            kind: 'timeout',
            message: 'Codex turn interrupt did not complete before timeout',
            data: {
              threadId: 'thread-server-interrupt-timeout',
              turnId: 'turn-server-interrupt-timeout',
              timeoutMs: 300,
              streamEnded: false,
            },
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
      const kernel = new AgentRuntimeKernel({
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
          hasCodexAdapterDebugEntry(terminalLog.debugLog, {
            kind: 'warning',
            message:
              'Codex cancellation requested before turn scope was established; turn/interrupt was not sent',
            data: {
              threadId: null,
              canInterrupt: false,
              reason: 'missing_turn_scope',
            },
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
    waitForDebugMethod: string
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

async function withTestServer(
  options: Parameters<typeof createServerApp>[0],
  testBody: (baseUrl: string) => Promise<void>,
): Promise<void> {
  const app = createServerApp(options)
  const server = app.listen(0)

  await new Promise<void>((resolve) => {
    server.once('listening', resolve)
  })

  const address = server.address()

  if (!address || typeof address === 'string') {
    throw new Error('Expected server to listen on a TCP port')
  }

  const baseUrl = `http://127.0.0.1:${address.port}`

  try {
    await testBody(baseUrl)
  } finally {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => {
        if (error) {
          reject(error)
          return
        }

        resolve()
      })
    })
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
