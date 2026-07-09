import assert from 'node:assert/strict'
import test from 'node:test'
import {
  AgentRuntimeKernel,
  type RuntimeRunDebugLogEntry,
} from '@ay-ple/runtime-core'
import { CodexRuntimeAdapter } from '@ay-ple/runtime-codex'
import { withFakeCodexAppServer } from '@ay-ple/runtime-codex/testing'
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
        const startResponse = await fetch(`${baseUrl}/api/runtime/runs`, {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
          },
          body: JSON.stringify({
            adapter: 'codex',
            prompt: 'Cancel from server API',
          }),
        })
        const startedRun = (await startResponse.json()) as { runId: string }

        assert.equal(startResponse.status, 201)

        await waitForServerRunLog(baseUrl, startedRun.runId, (run) =>
          hasClientRequest(run.debugLog, 'turn/start'),
        )

        const cancelResponse = await fetch(
          `${baseUrl}/api/runtime/runs/${startedRun.runId}/cancel`,
          {
            method: 'POST',
          },
        )
        const cancelledRun = await cancelResponse.json()

        assert.equal(cancelResponse.status, 200)
        assert.equal(cancelledRun.run.status, 'cancelled')

        const log = await waitForServerRunLog(
          baseUrl,
          startedRun.runId,
          (run) =>
            hasClientRequest(run.debugLog, 'turn/interrupt') &&
            hasTurnCompletionStatus(run.debugLog, 'interrupted'),
        )

        assert.equal(log.status, 'cancelled')
        assert.deepEqual(
          log.events.map((event: Record<string, unknown>) => event.type),
          ['started', 'cancelled'],
        )

        const historyResponse = await fetch(`${baseUrl}/api/runtime/runs`)
        const history = await historyResponse.json()

        assert.equal(historyResponse.status, 200)
        assert.equal(history.runs[0].runId, startedRun.runId)
        assert.equal(history.runs[0].status, 'cancelled')
        assert.equal(
          history.runs.some(
            (run: Record<string, unknown>) =>
              run.runId === startedRun.runId && run.status === 'running',
          ),
          false,
        )
      })
    },
  )
})

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
  const deadline = Date.now() + 1000

  while (Date.now() < deadline) {
    const response = await fetch(`${baseUrl}/api/runtime/runs/${runId}`)
    const data = await response.json()
    const run = data.run as ServerRunLog

    if (predicate(run)) {
      return run
    }

    await new Promise<void>((resolve) => {
      setImmediate(resolve)
    })
  }

  assert.fail('expected server run log condition was not observed')
}

function hasClientRequest(
  debugLog: RuntimeRunDebugLogEntry[] | undefined,
  method: string,
): boolean {
  return (
    debugLog
      ?.filter((entry) => entry.source === 'client' && entry.kind === 'stdin')
      .map((entry) => JSON.parse(String(entry.raw ?? '{}')) as { method?: string })
      .some((message) => message.method === method) ?? false
  )
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

      const data = entry.data as Record<string, unknown> | undefined
      const params = data?.params

      return (
        data?.method === 'turn/completed' &&
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
