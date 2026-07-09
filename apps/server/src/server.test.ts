import assert from 'node:assert/strict'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import { AgentRuntimeKernel } from '@ay-ple/runtime-core'
import { CodexRuntimeAdapter } from '@ay-ple/runtime-codex'
import { createServerApp } from './server.js'

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
  await withFakeCodexAppServer(async ({ scriptPath, tempDir }) => {
    const kernel = new AgentRuntimeKernel({
      adapters: [
        new CodexRuntimeAdapter({
          rawClientOptions: {
            codexBinPath: process.execPath,
            codexArgs: [scriptPath],
            cwd: tempDir,
            codexHome: join(tempDir, 'codex-home'),
            codexSqliteHome: join(tempDir, 'sqlite'),
            timeoutMs: 1000,
          },
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
  })
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

async function withFakeCodexAppServer(
  testBody: (fixture: { scriptPath: string; tempDir: string }) => Promise<void>,
): Promise<void> {
  const tempDir = await mkdtemp(join(tmpdir(), 'ay-ple-server-codex-'))
  const scriptPath = join(tempDir, 'fake-codex-app-server.mjs')

  await writeFile(scriptPath, fakeCodexAppServerSource)

  try {
    await testBody({ scriptPath, tempDir })
  } finally {
    await rm(tempDir, { recursive: true, force: true })
  }
}

const fakeCodexAppServerSource = String.raw`
import readline from 'node:readline'

const reader = readline.createInterface({ input: process.stdin })

reader.on('line', (line) => {
  const message = JSON.parse(line)

  if (message.method === 'initialize') {
    writeResponse(message.id, {
      userAgent: 'fake-codex-server-test',
      codexHome: process.env.CODEX_HOME ?? '',
      platformFamily: process.env.CODEX_SQLITE_HOME ?? '',
      platformOs: process.platform,
    })
    return
  }

  if (message.method === 'initialized') {
    return
  }

  if (message.method === 'thread/start') {
    writeResponse(message.id, {
      thread: {
        id: 'thread-server-test',
      },
    })
    return
  }

  if (message.method === 'turn/start') {
    writeResponse(message.id, {
      turn: {
        id: 'turn-server-test',
      },
    })

    setImmediate(() => {
      writeNotification('item/agentMessage/delta', {
        threadId: 'thread-server-test',
        turnId: 'turn-server-test',
        itemId: 'item-server-test',
        delta: 'Codex server path output',
      })
      writeNotification('turn/completed', {
        threadId: 'thread-server-test',
        turn: {
          id: 'turn-server-test',
          status: 'completed',
        },
      })
    })
  }
})

function writeResponse(id, result) {
  process.stdout.write(JSON.stringify({ id, result }) + '\n')
}

function writeNotification(method, params) {
  process.stdout.write(JSON.stringify({ method, params }) + '\n')
}
`
