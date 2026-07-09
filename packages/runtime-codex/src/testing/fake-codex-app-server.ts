import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type { CodexRawClientOptions } from '../raw-client.js'

export type FakeCodexAgentMessageDelta = {
  threadId?: string
  turnId?: string
  itemId?: string
  delta: string
}

export type FakeCodexTurnCompletion = {
  threadId?: string
  turnId?: string
  status?: string
  errorMessage?: string
}

export type FakeCodexAppServerScenario = {
  userAgent?: string
  threadId?: string
  turnId?: string
  agentMessageDeltas?: FakeCodexAgentMessageDelta[]
  turnCompletions?: FakeCodexTurnCompletion[]
  interruptTurnCompletion?: FakeCodexTurnCompletion
  initializeError?: string
  initializeHang?: boolean
  exitAfterInitialize?: boolean
  threadStartError?: string
  turnStartError?: string
  endBeforeTerminal?: boolean
}

export type FakeCodexAppServerFixture = {
  scriptPath: string
  tempDir: string
  rawClientOptions: CodexRawClientOptions
}

const defaultThreadId = 'thread-1'
const defaultTurnId = 'turn-1'

export async function withFakeCodexAppServer(
  scenario: FakeCodexAppServerScenario,
  testBody: (fixture: FakeCodexAppServerFixture) => Promise<void>,
): Promise<void> {
  const tempDir = await mkdtemp(join(tmpdir(), 'ay-ple-fake-codex-app-server-'))
  const scriptPath = join(tempDir, 'fake-codex-app-server.mjs')

  await writeFile(scriptPath, createFakeCodexAppServerSource(scenario))

  try {
    await testBody({
      scriptPath,
      tempDir,
      rawClientOptions: {
        codexBinPath: process.execPath,
        codexArgs: [scriptPath],
        cwd: tempDir,
        codexHome: join(tempDir, 'codex-home'),
        codexSqliteHome: join(tempDir, 'sqlite'),
        timeoutMs: 1000,
      },
    })
  } finally {
    await rm(tempDir, { recursive: true, force: true })
  }
}

function createFakeCodexAppServerSource(
  scenario: FakeCodexAppServerScenario,
): string {
  return `${fakeCodexAppServerSourcePrefix}
const scenario = ${JSON.stringify(normalizeScenario(scenario))}
${fakeCodexAppServerSourceSuffix}
`
}

function normalizeScenario(
  scenario: FakeCodexAppServerScenario,
): NormalizedFakeCodexAppServerScenario {
  const threadId = scenario.threadId ?? defaultThreadId
  const turnId = scenario.turnId ?? defaultTurnId

  return {
    userAgent: scenario.userAgent ?? 'fake-codex-app-server',
    threadId,
    turnId,
    agentMessageDeltas: (scenario.agentMessageDeltas ?? []).map((delta) => ({
      threadId: delta.threadId ?? threadId,
      turnId: delta.turnId ?? turnId,
      itemId: delta.itemId ?? 'item-1',
      delta: delta.delta,
    })),
    turnCompletions: (scenario.turnCompletions ?? [
      {
        threadId,
        turnId,
        status: 'completed',
      },
    ]).map((completion) => normalizeCompletion(completion, threadId, turnId)),
    interruptTurnCompletion: scenario.interruptTurnCompletion
      ? normalizeCompletion(scenario.interruptTurnCompletion, threadId, turnId)
      : null,
    initializeError: scenario.initializeError ?? null,
    initializeHang: scenario.initializeHang ?? false,
    exitAfterInitialize: scenario.exitAfterInitialize ?? false,
    threadStartError: scenario.threadStartError ?? null,
    turnStartError: scenario.turnStartError ?? null,
    endBeforeTerminal: scenario.endBeforeTerminal ?? false,
  }
}

type NormalizedFakeCodexTurnCompletion = {
  threadId: string
  turnId: string
  status: string
  errorMessage: string | null
}

type NormalizedFakeCodexAppServerScenario = {
  userAgent: string
  threadId: string
  turnId: string
  agentMessageDeltas: Required<FakeCodexAgentMessageDelta>[]
  turnCompletions: NormalizedFakeCodexTurnCompletion[]
  interruptTurnCompletion: NormalizedFakeCodexTurnCompletion | null
  initializeError: string | null
  initializeHang: boolean
  exitAfterInitialize: boolean
  threadStartError: string | null
  turnStartError: string | null
  endBeforeTerminal: boolean
}

function normalizeCompletion(
  completion: FakeCodexTurnCompletion,
  threadId: string,
  turnId: string,
): NormalizedFakeCodexTurnCompletion {
  return {
    threadId: completion.threadId ?? threadId,
    turnId: completion.turnId ?? turnId,
    status: completion.status ?? 'completed',
    errorMessage: completion.errorMessage ?? null,
  }
}

const fakeCodexAppServerSourcePrefix = String.raw`
import readline from 'node:readline'
`

const fakeCodexAppServerSourceSuffix = String.raw`
const reader = readline.createInterface({ input: process.stdin })

reader.on('line', (line) => {
  const message = JSON.parse(line)

  if (message.method === 'initialize') {
    if (scenario.exitAfterInitialize) {
      process.exit(7)
    }

    if (scenario.initializeHang) {
      return
    }

    if (scenario.initializeError) {
      writeError(message.id, scenario.initializeError)
      return
    }

    writeResponse(message.id, {
      userAgent: scenario.userAgent,
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
    if (scenario.threadStartError) {
      writeError(message.id, scenario.threadStartError)
      return
    }

    writeResponse(message.id, {
      thread: {
        id: scenario.threadId,
      },
    })
    return
  }

  if (message.method === 'turn/start') {
    if (scenario.turnStartError) {
      writeError(message.id, scenario.turnStartError)
      return
    }

    writeResponse(message.id, {
      turn: {
        id: scenario.turnId,
      },
    })

    setImmediate(() => {
      for (const delta of scenario.agentMessageDeltas) {
        writeNotification('item/agentMessage/delta', {
          threadId: delta.threadId,
          turnId: delta.turnId,
          itemId: delta.itemId,
          delta: delta.delta,
        })
      }

      for (const completion of scenario.turnCompletions) {
        writeTurnCompletion(completion)
      }

      if (scenario.endBeforeTerminal) {
        process.exit(0)
      }
    })

    return
  }

  if (message.method === 'turn/interrupt') {
    writeResponse(message.id, {})

    if (scenario.interruptTurnCompletion) {
      setImmediate(() => {
        writeTurnCompletion(scenario.interruptTurnCompletion)
      })
    }
  }
})

function writeResponse(id, result) {
  process.stdout.write(JSON.stringify({ id, result }) + '\n')
}

function writeError(id, message) {
  process.stdout.write(JSON.stringify({
    id,
    error: {
      message,
    },
  }) + '\n')
}

function writeNotification(method, params) {
  process.stdout.write(JSON.stringify({ method, params }) + '\n')
}

function writeTurnCompletion(completion) {
  writeNotification('turn/completed', {
    threadId: completion.threadId,
    turn: {
      id: completion.turnId,
      items: [],
      itemsView: {
        type: 'complete',
      },
      status: completion.status,
      error: completion.errorMessage
        ? {
            message: completion.errorMessage,
            codexErrorInfo: null,
            additionalDetails: null,
          }
        : null,
      startedAt: null,
      completedAt: null,
      durationMs: null,
    },
  })
}
`
