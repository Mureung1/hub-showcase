import assert from 'node:assert/strict'
import test from 'node:test'
import { createServerApp } from './server.js'

test('runtime API starts a fake run and streams normalized events', async () => {
  const app = createServerApp({ fakeDelayMs: 0 })
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
})

function parseSseData(stream: string): Array<Record<string, unknown>> {
  return stream
    .split('\n')
    .filter((line) => line.startsWith('data: '))
    .map((line) => JSON.parse(line.slice('data: '.length)))
}
