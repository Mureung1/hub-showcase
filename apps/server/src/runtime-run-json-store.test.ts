import assert from 'node:assert/strict'
import {
  mkdtemp,
  readFile,
  readdir,
  rename,
  rm,
  writeFile,
} from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import test from 'node:test'
import type { RuntimeRunLog } from '@ay-ple/runtime-core'
import {
  RuntimeRunJsonStore,
  type RuntimeRunJsonStoreFileOperations,
} from './runtime-run-json-store.js'

const firstRunId = '11111111-1111-4111-8111-111111111111'
const secondRunId = '22222222-2222-4222-8222-222222222222'
const thirdRunId = '33333333-3333-4333-8333-333333333333'
const fourthRunId = '44444444-4444-4444-8444-444444444444'

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

test('RuntimeRunJsonStore preserves the canonical record across atomic write stages', async (context) => {
  const failureCases: Array<{
    name: string
    fileOperations: Partial<RuntimeRunJsonStoreFileOperations>
  }> = [
    {
      name: 'write',
      fileOperations: {
        writeFile: async (filePath, contents) => {
          await writeFile(filePath, contents.subarray(0, 8), { flag: 'wx' })
          throw new Error('write blocked for test')
        },
      },
    },
    {
      name: 'sync',
      fileOperations: {
        syncFile: async () => {
          throw new Error('sync blocked for test')
        },
      },
    },
    {
      name: 'rename',
      fileOperations: {
        renameFile: async () => {
          throw new Error('rename blocked for test')
        },
      },
    },
  ]

  for (const failureCase of failureCases) {
    await context.test(failureCase.name, async () => {
      await withTemporaryDirectory(async (directory) => {
        const store = new RuntimeRunJsonStore({ directory })
        const startedLog = createRunLog({
          runId: firstRunId,
          prompt: 'preserve me',
          startedAt: '2026-07-10T01:00:00.000Z',
        })

        await store.save(startedLog)

        const canonicalPath = path.join(directory, `${firstRunId}.json`)
        const canonicalBeforeFailure = await readFile(canonicalPath)
        const failingStore = new RuntimeRunJsonStore({
          directory,
          fileOperations: failureCase.fileOperations,
        })

        await assert.rejects(
          failingStore.save(
            completeRunLog(startedLog, {
              completedAt: '2026-07-10T01:01:00.000Z',
              output: 'must not replace canonical',
            }),
          ),
          new RegExp(`${failureCase.name} blocked for test`),
        )

        assert.deepEqual(
          await readFile(canonicalPath),
          canonicalBeforeFailure,
        )
        assert.deepEqual(await store.load(), [startedLog])
        assert.deepEqual(await readdir(directory), [`${firstRunId}.json`])
      })
    })
  }
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

test('RuntimeRunJsonStore warns and continues canonical hydration when stale temporary cleanup fails', async () => {
  await withTemporaryDirectory(async (directory) => {
    const seedStore = new RuntimeRunJsonStore({ directory })
    const log = createRunLog({
      runId: firstRunId,
      prompt: 'hydrate despite stale temporary file',
      startedAt: '2026-07-10T01:00:00.000Z',
    })
    const temporaryFilename = `.${firstRunId}.${secondRunId}.tmp`
    const temporaryPath = path.join(directory, temporaryFilename)

    await seedStore.save(log)
    await writeFile(temporaryPath, '{partial', 'utf8')

    const warnings: string[] = []
    const originalWarn = console.warn
    console.warn = (message?: unknown) => {
      warnings.push(String(message))
    }

    try {
      const store = new RuntimeRunJsonStore({
        directory,
        fileOperations: {
          removeFile: async (filePath) => {
            if (filePath === temporaryPath) {
              throw new Error('cleanup blocked for test')
            }

            await rm(filePath, { force: true })
          },
        },
      })

      assert.deepEqual(await store.load(), [log])
    } finally {
      console.warn = originalWarn
    }

    assert.deepEqual(warnings, [
      `Unable to remove stale runtime history temporary file ${temporaryPath}: cleanup blocked for test`,
    ])
    assert.deepEqual(
      (await readdir(directory)).sort(),
      [temporaryFilename, `${firstRunId}.json`].sort(),
    )
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

    const recordPath = path.join(directory, `${firstRunId}.json`)

    await assert.rejects(store.load(), (error: unknown) => {
      assert.ok(error instanceof Error)
      assert.match(error.message, /Invalid runtime history record/)
      assert.ok(error.message.includes(recordPath))
      assert.match(
        error.message,
        new RegExp(`filename run ID ${firstRunId} does not match log run ID`),
      )

      return true
    })
  })
})

test('RuntimeRunJsonStore rejects a non-UUID canonical filename', async () => {
  await withTemporaryDirectory(async (directory) => {
    const store = new RuntimeRunJsonStore({ directory })

    await writeFile(path.join(directory, 'not-a-uuid.json'), '{}', 'utf8')

    await assert.rejects(store.load(), /filename run ID must be a UUID/)
  })
})

test('RuntimeRunJsonStore rejects malformed JSON, invalid envelopes, and unsupported schemas with the record path', async (context) => {
  const invalidRecords = [
    {
      name: 'malformed JSON',
      contents: '{not-json',
      expectedError: /malformed JSON/,
    },
    {
      name: 'invalid envelope',
      contents: JSON.stringify({
        schemaVersion: 1,
        savedAt: '2026-07-10T02:00:00.000Z',
      }),
      expectedError: /snapshot envelope is missing log/,
    },
    {
      name: 'unsupported schema',
      contents: JSON.stringify({
        schemaVersion: 2,
        savedAt: '2026-07-10T02:00:00.000Z',
        log: {},
      }),
      expectedError: /unsupported schemaVersion: 2/,
    },
  ]

  for (const invalidRecord of invalidRecords) {
    await context.test(invalidRecord.name, async () => {
      await withTemporaryDirectory(async (directory) => {
        const store = new RuntimeRunJsonStore({ directory })
        const recordPath = path.join(directory, `${firstRunId}.json`)

        await writeFile(recordPath, invalidRecord.contents, 'utf8')

        await assert.rejects(store.load(), (error: unknown) => {
          assert.ok(error instanceof Error)
          assert.match(error.message, /Invalid runtime history record/)
          assert.ok(error.message.includes(recordPath))
          assert.match(error.message, invalidRecord.expectedError)

          return true
        })
      })
    })
  }
})

test('RuntimeRunJsonStore wraps history directory preparation failures with the directory path', async () => {
  await withTemporaryDirectory(async (temporaryDirectory) => {
    const directory = path.join(temporaryDirectory, 'history-is-a-file')

    await writeFile(directory, 'not a directory', 'utf8')

    const store = new RuntimeRunJsonStore({ directory })

    await assert.rejects(store.load(), (error: unknown) => {
      assert.ok(error instanceof Error)
      assert.equal(
        error.message.startsWith(
          `Unable to prepare runtime history directory ${directory}:`,
        ),
        true,
      )

      return true
    })
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

test('RuntimeRunJsonStore prunes oldest terminal runs by count and preserves active records', async () => {
  await withTemporaryDirectory(async (directory) => {
    const store = new RuntimeRunJsonStore({
      directory,
      maxTerminalRuns: 2,
      maxTerminalBytes: 1_000_000,
    })
    const activeLog = createRunLog({
      runId: fourthRunId,
      prompt: 'keep active',
      startedAt: '2026-07-10T00:00:00.000Z',
    })
    const terminalLogs = [
      completeRunLog(
        createRunLog({
          runId: firstRunId,
          prompt: 'oldest terminal',
          startedAt: '2026-07-10T01:00:00.000Z',
        }),
        {
          completedAt: '2026-07-10T01:01:00.000Z',
          output: 'first',
        },
      ),
      completeRunLog(
        createRunLog({
          runId: secondRunId,
          prompt: 'middle terminal',
          startedAt: '2026-07-10T02:00:00.000Z',
        }),
        {
          completedAt: '2026-07-10T02:01:00.000Z',
          output: 'second',
        },
      ),
      completeRunLog(
        createRunLog({
          runId: thirdRunId,
          prompt: 'newest terminal',
          startedAt: '2026-07-10T03:00:00.000Z',
        }),
        {
          completedAt: '2026-07-10T03:01:00.000Z',
          output: 'third',
        },
      ),
    ]

    await store.save(activeLog)
    await store.save(terminalLogs[0])
    await store.save(terminalLogs[1])
    const saveResult = await store.save(terminalLogs[2])

    assert.deepEqual(saveResult, { removedRunIds: [firstRunId] })
    assert.deepEqual(
      (await store.load()).map((log) => log.runId),
      [fourthRunId, secondRunId, thirdRunId],
    )
  })
})

test('RuntimeRunJsonStore defers startup pruning until recovery saves are complete', async () => {
  await withTemporaryDirectory(async (directory) => {
    const oldTerminalLog = completeRunLog(
      createRunLog({
        runId: firstRunId,
        prompt: 'keep until recovery completes',
        startedAt: '2026-07-10T01:00:00.000Z',
      }),
      {
        completedAt: '2026-07-10T01:01:00.000Z',
        output: 'old terminal output',
      },
    )
    const interruptedLog = createRunLog({
      runId: secondRunId,
      prompt: 'recover before pruning',
      startedAt: '2026-07-10T02:00:00.000Z',
    })
    const seedStore = new RuntimeRunJsonStore({ directory })

    await seedStore.save(oldTerminalLog)
    await seedStore.save(interruptedLog)

    const startupStore = new RuntimeRunJsonStore({
      directory,
      maxTerminalRuns: 1,
      maxTerminalBytes: 1_000_000,
    })
    await startupStore.load()

    const recoveredAt = '2026-07-10T03:00:00.000Z'
    const recoveredLog: RuntimeRunLog = {
      ...failRunLog(interruptedLog, {
        error: 'Runtime interrupted by server restart',
        failedAt: recoveredAt,
      }),
      completedAt: recoveredAt,
    }

    assert.deepEqual(await startupStore.save(recoveredLog), {
      removedRunIds: [],
    })
    assert.deepEqual(
      (await readdir(directory)).sort(),
      [`${firstRunId}.json`, `${secondRunId}.json`],
    )

    assert.deepEqual(await startupStore.applyRetention(), {
      removedRunIds: [firstRunId],
    })
    assert.deepEqual(await startupStore.load(), [recoveredLog])
  })
})

test('RuntimeRunJsonStore measures aggregate terminal envelopes as canonical UTF-8 bytes', async () => {
  await withTemporaryDirectory(async (directory) => {
    const savedAt = '2026-07-10T04:00:00.000Z'
    const firstLog = completeRunLog(
      createRunLog({
        runId: firstRunId,
        prompt: '한글 terminal prompt',
        startedAt: '2026-07-10T01:00:00.000Z',
      }),
      {
        completedAt: '2026-07-10T01:01:00.000Z',
        output: '첫 번째 출력 😀',
      },
    )
    const secondLog = completeRunLog(
      createRunLog({
        runId: secondRunId,
        prompt: '두 번째 terminal prompt',
        startedAt: '2026-07-10T02:00:00.000Z',
      }),
      {
        completedAt: '2026-07-10T02:01:00.000Z',
        output: '두 번째 출력 🚀',
      },
    )
    const firstContents = canonicalEnvelopeContents(firstLog, savedAt)
    const secondContents = canonicalEnvelopeContents(secondLog, savedAt)
    const javascriptStringLengthLimit =
      firstContents.length + secondContents.length

    assert.ok(
      Buffer.byteLength(firstContents, 'utf8') < javascriptStringLengthLimit,
    )
    assert.ok(
      Buffer.byteLength(secondContents, 'utf8') < javascriptStringLengthLimit,
    )
    assert.ok(
      Buffer.byteLength(firstContents + secondContents, 'utf8') >
        javascriptStringLengthLimit,
    )

    const store = new RuntimeRunJsonStore({
      directory,
      maxTerminalRuns: 10,
      maxTerminalBytes: javascriptStringLengthLimit,
      now: () => new Date(savedAt),
    })

    await store.save(firstLog)
    const saveResult = await store.save(secondLog)

    assert.deepEqual(saveResult, { removedRunIds: [firstRunId] })
    assert.deepEqual(await store.load(), [secondLog])
  })
})

test('RuntimeRunJsonStore applies completed, started, and run ID retention ordering with legacy terminal timestamps', async () => {
  await withTemporaryDirectory(async (directory) => {
    const seedStore = new RuntimeRunJsonStore({ directory })
    const terminalLogs = [
      failRunLog(
        createRunLog({
          runId: firstRunId,
          prompt: 'run ID tie break one',
          startedAt: '2026-07-10T01:00:00.000Z',
        }),
        {
          failedAt: '2026-07-10T02:00:00.000Z',
          error: 'legacy failure',
        },
      ),
      cancelRunLog(
        createRunLog({
          runId: secondRunId,
          prompt: 'run ID tie break two',
          startedAt: '2026-07-10T01:00:00.000Z',
        }),
        {
          cancelledAt: '2026-07-10T02:00:00.000Z',
          reason: 'legacy cancellation',
        },
      ),
      completeRunLog(
        createRunLog({
          runId: thirdRunId,
          prompt: 'oldest completion',
          startedAt: '2026-07-10T03:00:00.000Z',
        }),
        {
          completedAt: '2026-07-10T01:00:00.000Z',
          output: 'completed first',
        },
      ),
      completeRunLog(
        createRunLog({
          runId: fourthRunId,
          prompt: 'started time tie break',
          startedAt: '2026-07-10T00:30:00.000Z',
        }),
        {
          completedAt: '2026-07-10T02:00:00.000Z',
          output: 'completed at tied time',
        },
      ),
    ]

    for (const log of terminalLogs.toReversed()) {
      await seedStore.save(log)
    }

    const boundedStore = new RuntimeRunJsonStore({
      directory,
      maxTerminalRuns: 2,
      maxTerminalBytes: 1_000_000,
    })

    const retentionResult = await boundedStore.applyRetention()

    assert.deepEqual(retentionResult, {
      removedRunIds: [thirdRunId, fourthRunId],
    })
    assert.deepEqual(
      (await boundedStore.load()).map((log) => log.runId),
      [firstRunId, secondRunId],
    )

    const singleRunStore = new RuntimeRunJsonStore({
      directory,
      maxTerminalRuns: 1,
      maxTerminalBytes: 1_000_000,
    })

    assert.deepEqual(await singleRunStore.applyRetention(), {
      removedRunIds: [firstRunId],
    })
    assert.deepEqual(await singleRunStore.load(), [terminalLogs[1]])
  })
})

test('RuntimeRunJsonStore excludes running and cancelling envelope bytes from retention', async () => {
  await withTemporaryDirectory(async (directory) => {
    const runningLog = createRunLog({
      runId: firstRunId,
      prompt: 'large running prompt 😀'.repeat(100),
      startedAt: '2026-07-10T01:00:00.000Z',
    })
    const cancellingStartedLog = createRunLog({
      runId: secondRunId,
      prompt: 'large cancelling prompt 한글'.repeat(100),
      startedAt: '2026-07-10T02:00:00.000Z',
    })
    const cancellingLog: RuntimeRunLog = {
      ...cancellingStartedLog,
      status: 'cancelling',
      events: [
        ...cancellingStartedLog.events,
        {
          type: 'cancelling',
          sequence: 2,
          runId: cancellingStartedLog.runId,
          adapter: cancellingStartedLog.adapter,
          timestamp: '2026-07-10T02:01:00.000Z',
          reason: 'keep cancelling active',
        },
      ],
    }
    const store = new RuntimeRunJsonStore({
      directory,
      maxTerminalRuns: 1,
      maxTerminalBytes: 1,
    })

    await store.save(runningLog)
    await store.save(cancellingLog)

    assert.deepEqual(await store.applyRetention(), { removedRunIds: [] })
    assert.deepEqual(await store.load(), [runningLog, cancellingLog])
  })
})

test('RuntimeRunJsonStore rejects an oversized terminal envelope before replacing its active snapshot', async () => {
  await withTemporaryDirectory(async (directory) => {
    const savedAt = '2026-07-10T04:00:00.000Z'
    const activeLog = createRunLog({
      runId: firstRunId,
      prompt: 'preserve active snapshot',
      startedAt: '2026-07-10T01:00:00.000Z',
    })
    const oversizedLog = completeRunLog(activeLog, {
      completedAt: '2026-07-10T01:01:00.000Z',
      output: '큰 출력 😀'.repeat(200),
    })
    const oversizedBytes = Buffer.byteLength(
      canonicalEnvelopeContents(oversizedLog, savedAt),
      'utf8',
    )
    const store = new RuntimeRunJsonStore({
      directory,
      maxTerminalRuns: 10,
      maxTerminalBytes: oversizedBytes - 1,
      now: () => new Date(savedAt),
    })

    await store.save(activeLog)

    await assert.rejects(
      store.save(oversizedLog),
      /terminal envelope.*exceeds.*byte limit/i,
    )
    assert.deepEqual(await store.load(), [activeLog])
    assert.deepEqual(await readdir(directory), [`${firstRunId}.json`])
  })
})

test('RuntimeRunJsonStore serializes remove after save and blocks later saves for the removed run ID', async () => {
  await withTemporaryDirectory(async (directory) => {
    const renameGate = createDeferred<void>()
    let renameStarted = false
    const store = new RuntimeRunJsonStore({
      directory,
      fileOperations: {
        renameFile: async (sourcePath, destinationPath) => {
          renameStarted = true
          await renameGate.promise
          await rename(sourcePath, destinationPath)
        },
      },
    })
    const log = createRunLog({
      runId: firstRunId,
      prompt: 'serialize persistence operations',
      startedAt: '2026-07-10T01:00:00.000Z',
    })

    const savePromise = store.save(log)

    while (!renameStarted) {
      await new Promise<void>((resolve) => setImmediate(resolve))
    }

    const removePromise = store.remove(firstRunId)
    renameGate.resolve()
    await Promise.all([savePromise, removePromise])

    const lateSaveResult = await store.save(log)

    assert.deepEqual(lateSaveResult, { removedRunIds: [firstRunId] })
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

function cancelRunLog(
  startedLog: RuntimeRunLog,
  input: { cancelledAt: string; reason: string },
): RuntimeRunLog {
  return {
    ...startedLog,
    status: 'cancelled',
    events: [
      ...startedLog.events,
      {
        type: 'cancelled',
        sequence: startedLog.events.length + 1,
        runId: startedLog.runId,
        adapter: startedLog.adapter,
        timestamp: input.cancelledAt,
        reason: input.reason,
      },
    ],
  }
}

function failRunLog(
  startedLog: RuntimeRunLog,
  input: { error: string; failedAt: string },
): RuntimeRunLog {
  return {
    ...startedLog,
    status: 'failed',
    error: input.error,
    events: [
      ...startedLog.events,
      {
        type: 'failed',
        sequence: startedLog.events.length + 1,
        runId: startedLog.runId,
        adapter: startedLog.adapter,
        timestamp: input.failedAt,
        error: input.error,
      },
    ],
  }
}

function canonicalEnvelopeContents(log: RuntimeRunLog, savedAt: string): string {
  return `${JSON.stringify({ schemaVersion: 1, savedAt, log })}\n`
}

function createDeferred<T>(): {
  promise: Promise<T>
  resolve: (value: T) => void
} {
  let resolvePromise: (value: T) => void = () => {}
  const promise = new Promise<T>((resolve) => {
    resolvePromise = resolve
  })

  return { promise, resolve: resolvePromise }
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
