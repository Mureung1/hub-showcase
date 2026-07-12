import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type { RuntimeRunDebugLogEntry } from '@ay-ple/runtime-core'
import type { CodexRawClientOptions } from '../raw-client.js'

export {
  withFakeCodexStdioTransport,
  type FakeCodexStdioJournalEntry,
  type FakeCodexStdioScenario,
  type FakeCodexStdioTransportFixture,
  type FakeCodexStdioTransportInput,
} from './fake-codex-stdio-transport.js'

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

export type FakeCodexErrorNotification = {
  threadId?: string
  turnId?: string
  willRetry?: boolean
  message: string
}

export type FakeCodexAuthStatus = {
  authMethod?: string | null
  authToken?: string | null
  requiresOpenaiAuth?: boolean | null
}

export type FakeCodexAppServerScenario = {
  userAgent?: string
  threadId?: string
  turnId?: string
  agentMessageDeltas?: FakeCodexAgentMessageDelta[]
  turnCompletions?: FakeCodexTurnCompletion[]
  interruptTurnCompletion?: FakeCodexTurnCompletion
  errorNotifications?: FakeCodexErrorNotification[]
  initializeError?: string
  initializeHang?: boolean
  exitAfterInitialize?: boolean
  threadStartHang?: boolean
  threadStartError?: string
  turnStartError?: string
  turnInterruptError?: string
  endBeforeTerminal?: boolean
  authStatus?: FakeCodexAuthStatus
}

export type FakeCodexAppServerFixture = {
  scriptPath: string
  tempDir: string
  rawClientOptions: CodexRawClientOptions
}

export type CodexDebugClientRequestMethod =
  | 'initialize'
  | 'initialized'
  | 'getAuthStatus'
  | 'thread/list'
  | 'thread/loaded/list'
  | 'thread/read'
  | 'thread/start'
  | 'turn/start'
  | 'turn/steer'
  | 'turn/interrupt'

const defaultThreadId = 'thread-1'
const defaultTurnId = 'turn-1'
const interruptCompletionTimeoutMessage =
  'Codex turn interrupt did not complete before timeout'
const missingTurnScopeCancellationMessage =
  'Codex cancellation requested before turn scope was established; turn/interrupt was not sent'

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

export function readCodexDebugClientRequest(
  debugLog: RuntimeRunDebugLogEntry[] | undefined,
  method: CodexDebugClientRequestMethod,
): { method?: string; params?: unknown } | undefined {
  return debugLog
    ?.filter((entry) => entry.source === 'client' && entry.kind === 'stdin')
    .map(
      (entry) =>
        JSON.parse(entry.raw ?? '{}') as {
          method?: string
          params?: unknown
        },
    )
    .find((message) => message.method === method)
}

export function hasCodexDebugClientRequest(
  debugLog: RuntimeRunDebugLogEntry[] | undefined,
  method: CodexDebugClientRequestMethod,
): boolean {
  return readCodexDebugClientRequest(debugLog, method) !== undefined
}

export function hasCodexDebugNotification(
  debugLog: RuntimeRunDebugLogEntry[] | undefined,
  method: string,
): boolean {
  return (
    debugLog?.some(
      (entry) =>
        entry.source === 'server' &&
        entry.kind === 'notification' &&
        entry.data?.method === method,
    ) ?? false
  )
}

export function hasCodexDebugTurnCompletionStatus(
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

export function readCodexAdapterDebugEntry(
  debugLog: RuntimeRunDebugLogEntry[] | undefined,
  input: {
    kind: string
    message: string
    data?: Record<string, unknown>
  },
): RuntimeRunDebugLogEntry | undefined {
  return debugLog?.find((entry) => {
    if (
      entry.source !== 'adapter' ||
      entry.kind !== input.kind ||
      entry.message !== input.message
    ) {
      return false
    }

    if (!input.data) {
      return true
    }

    return Object.entries(input.data).every(
      ([key, value]) => entry.data?.[key] === value,
    )
  })
}

export function hasCodexAdapterDebugEntry(
  debugLog: RuntimeRunDebugLogEntry[] | undefined,
  input: {
    kind: string
    message: string
    data?: Record<string, unknown>
  },
): boolean {
  return readCodexAdapterDebugEntry(debugLog, input) !== undefined
}

export function hasCodexInterruptTimeoutDebugEvidence(
  debugLog: RuntimeRunDebugLogEntry[] | undefined,
  input: {
    threadId: string
    turnId: string
    timeoutMs: number
    streamEnded?: boolean
  },
): boolean {
  return hasCodexAdapterDebugEntry(debugLog, {
    kind: 'timeout',
    message: interruptCompletionTimeoutMessage,
    data: {
      threadId: input.threadId,
      turnId: input.turnId,
      timeoutMs: input.timeoutMs,
      streamEnded: input.streamEnded ?? false,
    },
  })
}

export function hasCodexMissingTurnScopeDebugEvidence(
  debugLog: RuntimeRunDebugLogEntry[] | undefined,
  input: {
    threadId: string | null
  },
): boolean {
  return hasCodexAdapterDebugEntry(debugLog, {
    kind: 'warning',
    message: missingTurnScopeCancellationMessage,
    data: {
      threadId: input.threadId,
      canInterrupt: false,
      reason: 'missing_turn_scope',
    },
  })
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
    errorNotifications: (scenario.errorNotifications ?? []).map(
      (notification) => ({
        threadId: notification.threadId ?? threadId,
        turnId: notification.turnId ?? turnId,
        willRetry: notification.willRetry ?? false,
        message: notification.message,
      }),
    ),
    initializeError: scenario.initializeError ?? null,
    initializeHang: scenario.initializeHang ?? false,
    exitAfterInitialize: scenario.exitAfterInitialize ?? false,
    threadStartHang: scenario.threadStartHang ?? false,
    threadStartError: scenario.threadStartError ?? null,
    turnStartError: scenario.turnStartError ?? null,
    turnInterruptError: scenario.turnInterruptError ?? null,
    endBeforeTerminal: scenario.endBeforeTerminal ?? false,
    authStatus: {
      authMethod: scenario.authStatus?.authMethod ?? null,
      authToken: scenario.authStatus?.authToken ?? null,
      requiresOpenaiAuth: scenario.authStatus?.requiresOpenaiAuth ?? true,
    },
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
  errorNotifications: Required<FakeCodexErrorNotification>[]
  initializeError: string | null
  initializeHang: boolean
  exitAfterInitialize: boolean
  threadStartHang: boolean
  threadStartError: string | null
  turnStartError: string | null
  turnInterruptError: string | null
  endBeforeTerminal: boolean
  authStatus: Required<FakeCodexAuthStatus>
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

  if (message.method === 'getAuthStatus') {
    writeResponse(message.id, {
      authMethod: scenario.authStatus.authMethod,
      authToken: message.params?.includeToken === true
        ? scenario.authStatus.authToken
        : null,
      requiresOpenaiAuth: scenario.authStatus.requiresOpenaiAuth,
    })
    return
  }

  if (message.method === 'thread/start') {
    if (scenario.threadStartHang) {
      return
    }

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

  if (message.method === 'thread/list') {
    writeResponse(message.id, {
      data: [createThread()],
      nextCursor: null,
      backwardsCursor: null,
    })
    return
  }

  if (message.method === 'thread/loaded/list') {
    writeResponse(message.id, {
      data: [scenario.threadId],
      nextCursor: null,
    })
    return
  }

  if (message.method === 'thread/read') {
    writeResponse(message.id, {
      thread: createThread({
        includeTurns: message.params?.includeTurns === true,
      }),
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
      writeTurnStarted()

      for (const delta of scenario.agentMessageDeltas) {
        writeNotification('item/agentMessage/delta', {
          threadId: delta.threadId,
          turnId: delta.turnId,
          itemId: delta.itemId,
          delta: delta.delta,
        })
      }

      for (const errorNotification of scenario.errorNotifications) {
        writeErrorNotification(errorNotification)
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

  if (message.method === 'turn/steer') {
    writeResponse(message.id, {
      turnId: scenario.turnId,
    })
    return
  }

  if (message.method === 'turn/interrupt') {
    if (scenario.turnInterruptError) {
      writeError(message.id, scenario.turnInterruptError)
      return
    }

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

function writeErrorNotification(errorNotification) {
  writeNotification('error', {
    threadId: errorNotification.threadId,
    turnId: errorNotification.turnId,
    willRetry: errorNotification.willRetry,
    error: {
      message: errorNotification.message,
      codexErrorInfo: null,
      additionalDetails: null,
    },
  })
}

function writeTurnCompletion(completion) {
  writeNotification('turn/completed', {
    threadId: completion.threadId,
    turn: createTurn(completion.turnId, completion.status, completion.errorMessage),
  })
}

function writeTurnStarted() {
  writeNotification('turn/started', {
    threadId: scenario.threadId,
    turn: createTurn(scenario.turnId, 'inProgress', null),
  })
}

function createTurn(id, status, errorMessage) {
  return {
    id,
    items: [],
    itemsView: {
      type: 'complete',
    },
    status,
    error: errorMessage
      ? {
          message: errorMessage,
          codexErrorInfo: null,
          additionalDetails: null,
        }
      : null,
    startedAt: null,
    completedAt: null,
    durationMs: null,
  }
}

function createThread(options = {}) {
  return {
    id: scenario.threadId,
    preview: 'fake thread for raw capability slots',
    turns: options.includeTurns
      ? [
          {
            id: scenario.turnId,
            status: 'completed',
          },
        ]
      : [],
  }
}
`

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}
