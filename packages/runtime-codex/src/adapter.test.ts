import assert from 'node:assert/strict'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import { AgentRuntimeKernel } from '@ay-ple/runtime-core'
import { CodexRuntimeAdapter } from './index.js'

test('CodexRuntimeAdapter maps Codex turn notifications to normalized run output', async () => {
  await withFakeTurnAppServer(async ({ scriptPath, tempDir }) => {
    const adapter = new CodexRuntimeAdapter({
      rawClientOptions: {
        codexBinPath: process.execPath,
        codexArgs: [scriptPath],
        cwd: tempDir,
        codexHome: join(tempDir, 'codex-home'),
        codexSqliteHome: join(tempDir, 'sqlite'),
        timeoutMs: 1000,
      },
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
  })
})

async function withFakeTurnAppServer(
  testBody: (fixture: { scriptPath: string; tempDir: string }) => Promise<void>,
): Promise<void> {
  const tempDir = await mkdtemp(join(tmpdir(), 'ay-ple-codex-adapter-'))
  const scriptPath = join(tempDir, 'fake-turn-app-server.mjs')

  await writeFile(scriptPath, fakeTurnAppServerSource)

  try {
    await testBody({ scriptPath, tempDir })
  } finally {
    await rm(tempDir, { recursive: true, force: true })
  }
}

const fakeTurnAppServerSource = String.raw`
import readline from 'node:readline'

const reader = readline.createInterface({ input: process.stdin })

reader.on('line', (line) => {
  const message = JSON.parse(line)

  if (message.method === 'initialize') {
    writeResponse(message.id, {
      userAgent: 'fake-codex-turn-server',
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
        id: 'thread-1',
      },
    })
    return
  }

  if (message.method === 'turn/start') {
    writeResponse(message.id, {
      turn: {
        id: 'turn-1',
      },
    })

    setImmediate(() => {
      writeNotification('item/agentMessage/delta', {
        threadId: 'thread-1',
        turnId: 'other-turn',
        itemId: 'ignored-item',
        delta: 'ignored turn',
      })
      writeNotification('item/agentMessage/delta', {
        threadId: 'other-thread',
        turnId: 'turn-1',
        itemId: 'ignored-item',
        delta: 'ignored thread',
      })
      writeNotification('item/agentMessage/delta', {
        threadId: 'thread-1',
        turnId: 'turn-1',
        itemId: 'item-1',
        delta: 'Hello ',
      })
      writeNotification('item/agentMessage/delta', {
        threadId: 'thread-1',
        turnId: 'turn-1',
        itemId: 'item-1',
        delta: 'from Codex',
      })
      writeNotification('turn/completed', {
        threadId: 'thread-1',
        turn: {
          id: 'other-turn',
          status: 'completed',
        },
      })
      writeNotification('turn/completed', {
        threadId: 'thread-1',
        turn: {
          id: 'turn-1',
          status: 'failed',
        },
      })
      writeNotification('turn/completed', {
        threadId: 'thread-1',
        turn: {
          id: 'turn-1',
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
