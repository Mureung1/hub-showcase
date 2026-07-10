import assert from 'node:assert/strict'
import { mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import test from 'node:test'
import type { RuntimeRunLog } from '@ay-ple/runtime-core'
import { RuntimeRunJsonStore } from './runtime-run-json-store.js'

const firstRunId = '11111111-1111-4111-8111-111111111111'
const secondRunId = '22222222-2222-4222-8222-222222222222'
const thirdRunId = '33333333-3333-4333-8333-333333333333'

test('RuntimeRunJsonStore saves a versioned envelope and atomically replaces one canonical record', async () => {
  await withTemporaryDirectory(async (directory) => {
    const store = new RuntimeRunJsonStore({
      directory,
      now: () => new Date('2026-07-10T02:00:00.000Z'),
    })
    const startedLog = createRunLog({
      runId: firstRunId,
      prompt: 'persist me',
      startedAt: '2026-07-10T01:00:00.000Z',
    })

    await store.save(startedLog)

    const canonicalPath = path.join(directory, `${firstRunId}.json`)
    const startedEnvelope = JSON.parse(
      await readFile(canonicalPath, 'utf8'),
    ) as Record<string, unknown>

    assert.deepEqual(startedEnvelope, {
      schemaVersion: 1,
      savedAt: '2026-07-10T02:00:00.000Z',
      log: startedLog,
    })

    const completedLog = completeRunLog(startedLog, {
      completedAt: '2026-07-10T01:01:00.000Z',
      output: 'restored output',
    })

    await store.save(completedLog)

    assert.deepEqual(await readdir(directory), [`${firstRunId}.json`])
    assert.deepEqual(await store.load(), [completedLog])
  })
})

test('RuntimeRunJsonStore rejects invalid run IDs for persistence operations', async () => {
  await withTemporaryDirectory(async (directory) => {
    const store = new RuntimeRunJsonStore({ directory })
    const invalidLog = createRunLog({
      runId: 'not-a-uuid',
      prompt: 'must not persist',
      startedAt: '2026-07-10T01:00:00.000Z',
    })

    await assert.rejects(store.save(invalidLog), /run ID must be a UUID/)
    await assert.rejects(store.remove('not-a-uuid'), /run ID must be a UUID/)

    assert.deepEqual(await readdir(directory), [])
  })
})

test('RuntimeRunJsonStore preserves the canonical record when atomic rename fails', async () => {
  await withTemporaryDirectory(async (directory) => {
    const store = new RuntimeRunJsonStore({ directory })
    const startedLog = createRunLog({
      runId: firstRunId,
      prompt: 'preserve me',
      startedAt: '2026-07-10T01:00:00.000Z',
    })

    await store.save(startedLog)

    const failingStore = new RuntimeRunJsonStore({
      directory,
      renameFile: async () => {
        throw new Error('rename blocked for test')
      },
    })

    await assert.rejects(
      failingStore.save(
        completeRunLog(startedLog, {
          completedAt: '2026-07-10T01:01:00.000Z',
          output: 'must not replace canonical',
        }),
      ),
      /rename blocked for test/,
    )

    assert.deepEqual(await store.load(), [startedLog])
    assert.deepEqual(await readdir(directory), [`${firstRunId}.json`])
  })
})

test('RuntimeRunJsonStore removes stale same-directory temporary files during load', async () => {
  await withTemporaryDirectory(async (directory) => {
    const store = new RuntimeRunJsonStore({ directory })
    const temporaryFilename = `.${firstRunId}.${secondRunId}.tmp`
    const unrelatedFilename = `.${firstRunId}.not-a-uuid.tmp`

    await writeFile(path.join(directory, temporaryFilename), '{partial', 'utf8')
    await writeFile(path.join(directory, unrelatedFilename), '{partial', 'utf8')

    assert.deepEqual(await store.load(), [])
    assert.deepEqual(await readdir(directory), [unrelatedFilename])
  })
})

test('RuntimeRunJsonStore hydrates canonical records in started time order', async () => {
  await withTemporaryDirectory(async (directory) => {
    const store = new RuntimeRunJsonStore({ directory })
    const logs = [
      createRunLog({
        runId: secondRunId,
        prompt: 'middle',
        startedAt: '2026-07-10T01:01:00.000Z',
      }),
      createRunLog({
        runId: thirdRunId,
        prompt: 'newest',
        startedAt: '2026-07-10T01:02:00.000Z',
      }),
      createRunLog({
        runId: firstRunId,
        prompt: 'oldest',
        startedAt: '2026-07-10T01:00:00.000Z',
      }),
    ]

    for (const log of logs) {
      await store.save(log)
    }

    assert.deepEqual(
      (await store.load()).map((log) => log.runId),
      [firstRunId, secondRunId, thirdRunId],
    )
  })
})

test('RuntimeRunJsonStore rejects a filename and run ID mismatch', async () => {
  await withTemporaryDirectory(async (directory) => {
    const store = new RuntimeRunJsonStore({ directory })
    const mismatchedLog = createRunLog({
      runId: secondRunId,
      prompt: 'mismatch',
      startedAt: '2026-07-10T01:00:00.000Z',
    })

    await writeFile(
      path.join(directory, `${firstRunId}.json`),
      JSON.stringify({
        schemaVersion: 1,
        savedAt: '2026-07-10T02:00:00.000Z',
        log: mismatchedLog,
      }),
      'utf8',
    )

    await assert.rejects(
      store.load(),
      new RegExp(`filename run ID ${firstRunId} does not match log run ID`),
    )
  })
})

test('RuntimeRunJsonStore rejects a non-UUID canonical filename', async () => {
  await withTemporaryDirectory(async (directory) => {
    const store = new RuntimeRunJsonStore({ directory })

    await writeFile(path.join(directory, 'not-a-uuid.json'), '{}', 'utf8')

    await assert.rejects(store.load(), /filename run ID must be a UUID/)
  })
})

test('RuntimeRunJsonStore rejects malformed canonical records', async () => {
  await withTemporaryDirectory(async (directory) => {
    const store = new RuntimeRunJsonStore({ directory })

    await writeFile(
      path.join(directory, `${firstRunId}.json`),
      JSON.stringify({
        schemaVersion: 2,
        savedAt: 'not-an-iso-time',
        log: {},
      }),
      'utf8',
    )

    await assert.rejects(store.load(), /unsupported schemaVersion/)
  })
})

test('RuntimeRunJsonStore rejects lifecycle events after a terminal event', async () => {
  await withTemporaryDirectory(async (directory) => {
    const store = new RuntimeRunJsonStore({ directory })
    const completedLog = completeRunLog(
      createRunLog({
        runId: firstRunId,
        prompt: 'invalid lifecycle',
        startedAt: '2026-07-10T01:00:00.000Z',
      }),
      {
        completedAt: '2026-07-10T01:01:00.000Z',
        output: 'completed once',
      },
    )

    completedLog.events.push({
      type: 'completed',
      sequence: 4,
      runId: firstRunId,
      adapter: 'fake',
      timestamp: '2026-07-10T01:02:00.000Z',
      output: 'completed once',
    })

    await writeFile(
      path.join(directory, `${firstRunId}.json`),
      JSON.stringify({
        schemaVersion: 1,
        savedAt: '2026-07-10T02:00:00.000Z',
        log: completedLog,
      }),
      'utf8',
    )

    await assert.rejects(store.load(), /events cannot continue after terminal/)
  })
})

test('RuntimeRunJsonStore removes a canonical record by run ID', async () => {
  await withTemporaryDirectory(async (directory) => {
    const store = new RuntimeRunJsonStore({ directory })
    const log = createRunLog({
      runId: firstRunId,
      prompt: 'remove me',
      startedAt: '2026-07-10T01:00:00.000Z',
    })

    await store.save(log)
    await store.remove(firstRunId)
    await store.remove(firstRunId)

    assert.deepEqual(await store.load(), [])
  })
})

function createRunLog(input: {
  runId: string
  prompt: string
  startedAt: string
}): RuntimeRunLog {
  return {
    runId: input.runId,
    adapter: 'fake',
    prompt: input.prompt,
    status: 'running',
    output: '',
    events: [
      {
        type: 'started',
        sequence: 1,
        runId: input.runId,
        adapter: 'fake',
        timestamp: input.startedAt,
        prompt: input.prompt,
      },
    ],
    startedAt: input.startedAt,
  }
}

function completeRunLog(
  startedLog: RuntimeRunLog,
  input: { completedAt: string; output: string },
): RuntimeRunLog {
  return {
    ...startedLog,
    status: 'completed',
    output: input.output,
    events: [
      ...startedLog.events,
      {
        type: 'output_delta',
        sequence: 2,
        runId: startedLog.runId,
        adapter: startedLog.adapter,
        timestamp: input.completedAt,
        delta: input.output,
      },
      {
        type: 'completed',
        sequence: 3,
        runId: startedLog.runId,
        adapter: startedLog.adapter,
        timestamp: input.completedAt,
        output: input.output,
      },
    ],
    debugLog: [
      {
        timestamp: input.completedAt,
        source: 'fake-runtime',
        kind: 'run_started',
        message: 'Fake runtime accepted a run',
        data: {
          runId: startedLog.runId,
          prompt: startedLog.prompt,
        },
      },
    ],
    completedAt: input.completedAt,
  }
}

async function withTemporaryDirectory(
  testBody: (directory: string) => Promise<void>,
): Promise<void> {
  const directory = await mkdtemp(path.join(tmpdir(), 'runtime-run-store-'))

  try {
    await testBody(directory)
  } finally {
    await rm(directory, { force: true, recursive: true })
  }
}
