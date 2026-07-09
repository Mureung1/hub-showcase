import type {
  AgentRuntimeAdapter,
  RuntimeAdapterEvent,
  RuntimeAdapterRunInput,
  RuntimeRunDebugLogEntry,
} from '@ay-ple/runtime-core'
import {
  CodexRawClient,
  type CodexRawClientOptions,
  type CodexRawDebugLogEntry,
  type CodexRawServerNotification,
  type CodexRawTextInput,
} from './raw-client.js'

type CodexTurnScope = {
  threadId: string
  turnId: string
}

type CodexTurnTerminalStatus = 'completed' | 'interrupted' | 'failed'

type CodexTurnCompletion = {
  status: CodexTurnTerminalStatus
  errorMessage?: string
}

type AbortedNotificationWait = {
  type: 'aborted'
  pendingNotification?: Promise<IteratorResult<CodexRawServerNotification>>
}

export type CodexRuntimeAdapterOptions = {
  rawClientOptions?: CodexRawClientOptions
  createClient?: () => CodexRawClient
}

export class CodexRuntimeAdapter implements AgentRuntimeAdapter {
  readonly name = 'codex'
  readonly label = 'Codex Runtime'
  readonly description = 'Codex app-server adapter for Runtime Inspector parity'

  private readonly createClient: () => CodexRawClient

  constructor(options: CodexRuntimeAdapterOptions = {}) {
    this.createClient =
      options.createClient ??
      (() => new CodexRawClient(options.rawClientOptions))
  }

  async *run(input: RuntimeAdapterRunInput): AsyncIterable<RuntimeAdapterEvent> {
    const client = this.createClient()
    let emittedDebugEntries = 0
    let turnScope: CodexTurnScope | undefined
    const emitDebugLog = (): RuntimeAdapterEvent | undefined => {
      const debugLog = client.getDebugLog()
      const entries = debugLog
        .slice(emittedDebugEntries)
        .map(toRuntimeDebugLogEntry)
      emittedDebugEntries = debugLog.length

      if (entries.length < 1) {
        return undefined
      }

      return {
        type: 'debug_log',
        entries,
      }
    }
    const abortClient = () => {
      if (!turnScope) {
        void client.close()
      }
    }

    input.signal.addEventListener('abort', abortClient, { once: true })

    try {
      await client.initialize()

      const initializedDebugLog = emitDebugLog()

      if (initializedDebugLog) {
        yield initializedDebugLog
      }

      if (input.signal.aborted) {
        return
      }

      const thread = await client.startThread()
      const threadDebugLog = emitDebugLog()

      if (threadDebugLog) {
        yield threadDebugLog
      }

      if (input.signal.aborted) {
        return
      }

      const promptInput: CodexRawTextInput = {
        type: 'text',
        text: input.prompt,
        text_elements: [],
      }
      const turn = await client.startTurn({
        threadId: thread.threadId,
        input: [promptInput],
      })
      turnScope = {
        threadId: thread.threadId,
        turnId: turn.turnId,
      }
      const turnDebugLog = emitDebugLog()

      if (turnDebugLog) {
        yield turnDebugLog
      }

      const notifications = client.notifications()[Symbol.asyncIterator]()

      while (true) {
        if (input.signal.aborted) {
          yield* interruptTurnAndDrainNotifications(
            client,
            notifications,
            turnScope,
            emitDebugLog,
          )
          return
        }

        const notification = await nextNotificationOrAbort(
          notifications,
          input.signal,
        )

        if (isAbortedNotificationWait(notification)) {
          yield* interruptTurnAndDrainNotifications(
            client,
            notifications,
            turnScope,
            emitDebugLog,
            notification.pendingNotification,
          )
          return
        }

        if (notification.done) {
          throw new Error(
            'Codex notification stream ended before terminal turn',
          )
        }

        const notificationDebugLog = emitDebugLog()

        if (notificationDebugLog) {
          yield notificationDebugLog
        }

        const delta = extractMatchingAgentMessageDelta(
          notification.value,
          turnScope,
        )

        if (delta !== undefined) {
          yield {
            type: 'output_delta',
            delta,
          }
        }

        const completion = readMatchingTurnCompletion(
          notification.value,
          turnScope,
        )

        if (completion) {
          await client.close()

          const completedDebugLog = emitDebugLog()

          if (completedDebugLog) {
            yield completedDebugLog
          }

          yield toTerminalAdapterEvent(completion)

          return
        }
      }
    } catch (error) {
      const failureDebugLog = emitDebugLog()

      if (failureDebugLog) {
        yield failureDebugLog
      }

      throw error
    } finally {
      input.signal.removeEventListener('abort', abortClient)
      await client.close()
    }
  }
}

function isAbortedNotificationWait(
  value: IteratorResult<CodexRawServerNotification> | AbortedNotificationWait,
): value is AbortedNotificationWait {
  return isRecord(value) && value.type === 'aborted'
}

async function* interruptTurnAndDrainNotifications(
  client: CodexRawClient,
  notifications: AsyncIterator<CodexRawServerNotification>,
  turnScope: CodexTurnScope,
  emitDebugLog: () => RuntimeAdapterEvent | undefined,
  initialPendingNotification?: Promise<
    IteratorResult<CodexRawServerNotification>
  >,
): AsyncIterable<RuntimeAdapterEvent> {
  try {
    await client.interruptTurn(turnScope)
  } catch {
    const failureDebugLog = emitDebugLog()

    if (failureDebugLog) {
      yield failureDebugLog
    }

    return
  }

  const interruptDebugLog = emitDebugLog()

  if (interruptDebugLog) {
    yield interruptDebugLog
  }

  const deadline = Date.now() + 300
  let pendingNotification = initialPendingNotification

  while (Date.now() < deadline) {
    const notification = pendingNotification
      ? await notificationOrTimeout(pendingNotification, deadline - Date.now())
      : await nextNotificationOrTimeout(notifications, deadline - Date.now())
    pendingNotification = undefined

    if (notification === 'timeout' || notification.done) {
      return
    }

    const notificationDebugLog = emitDebugLog()

    if (notificationDebugLog) {
      yield notificationDebugLog
    }

    const completion = readMatchingTurnCompletion(
      notification.value,
      turnScope,
    )

    if (completion) {
      yield toTerminalAdapterEvent(completion)
      return
    }
  }
}

async function nextNotificationOrAbort(
  notifications: AsyncIterator<CodexRawServerNotification>,
  signal: AbortSignal,
): Promise<
  IteratorResult<CodexRawServerNotification> | AbortedNotificationWait
> {
  if (signal.aborted) {
    return { type: 'aborted' }
  }

  let abortListener = () => {}
  const notificationPromise = notifications.next()
  const abortPromise = new Promise<AbortedNotificationWait>((resolve) => {
    abortListener = () =>
      resolve({
        type: 'aborted',
        pendingNotification: notificationPromise,
      })
    signal.addEventListener('abort', abortListener, { once: true })
  })

  try {
    return await Promise.race([notificationPromise, abortPromise])
  } finally {
    signal.removeEventListener('abort', abortListener)
  }
}

async function nextNotificationOrTimeout(
  notifications: AsyncIterator<CodexRawServerNotification>,
  timeoutMs: number,
): Promise<IteratorResult<CodexRawServerNotification> | 'timeout'> {
  return notificationOrTimeout(notifications.next(), timeoutMs)
}

async function notificationOrTimeout(
  notificationPromise: Promise<IteratorResult<CodexRawServerNotification>>,
  timeoutMs: number,
): Promise<IteratorResult<CodexRawServerNotification> | 'timeout'> {
  if (timeoutMs <= 0) {
    return 'timeout'
  }

  let timeout: NodeJS.Timeout | undefined
  const timeoutPromise = new Promise<'timeout'>((resolve) => {
    timeout = setTimeout(() => resolve('timeout'), timeoutMs)
  })

  try {
    return await Promise.race([notificationPromise, timeoutPromise])
  } finally {
    if (timeout) {
      clearTimeout(timeout)
    }
  }
}

function extractMatchingAgentMessageDelta(
  notification: CodexRawServerNotification,
  turnScope: CodexTurnScope,
): string | undefined {
  if (notification.method !== 'item/agentMessage/delta') {
    return undefined
  }

  const params = notificationParams(notification)

  if (!params || !matchesThreadAndTurn(params, turnScope)) {
    return undefined
  }

  const delta = params.delta

  return typeof delta === 'string' ? delta : undefined
}

function readMatchingTurnCompletion(
  notification: CodexRawServerNotification,
  turnScope: CodexTurnScope,
): CodexTurnCompletion | undefined {
  if (notification.method !== 'turn/completed') {
    return undefined
  }

  const params = notificationParams(notification)

  if (!params || readString(params, 'threadId') !== turnScope.threadId) {
    return undefined
  }

  const turn = params.turn

  if (!isRecord(turn) || readString(turn, 'id') !== turnScope.turnId) {
    return undefined
  }

  const status = readString(turn, 'status')

  if (!isCodexTurnTerminalStatus(status)) {
    return undefined
  }

  return {
    status,
    errorMessage: readTurnErrorMessage(turn),
  }
}

function toTerminalAdapterEvent(
  completion: CodexTurnCompletion,
): RuntimeAdapterEvent {
  if (completion.status === 'completed') {
    return { type: 'completed' }
  }

  if (completion.status === 'interrupted') {
    return {
      type: 'cancelled',
      reason: 'Codex turn interrupted',
    }
  }

  return {
    type: 'failed',
    error: completion.errorMessage ?? 'Codex turn failed',
  }
}

function isCodexTurnTerminalStatus(
  status: string | undefined,
): status is CodexTurnTerminalStatus {
  return (
    status === 'completed' || status === 'interrupted' || status === 'failed'
  )
}

function readTurnErrorMessage(turn: Record<string, unknown>): string | undefined {
  const error = turn.error

  if (!isRecord(error)) {
    return undefined
  }

  return readString(error, 'message')
}

function matchesThreadAndTurn(
  params: Record<string, unknown>,
  turnScope: CodexTurnScope,
): boolean {
  return (
    readString(params, 'threadId') === turnScope.threadId &&
    readString(params, 'turnId') === turnScope.turnId
  )
}

function notificationParams(
  notification: CodexRawServerNotification,
): Record<string, unknown> | undefined {
  return isRecord(notification.params) ? notification.params : undefined
}

function toRuntimeDebugLogEntry(
  entry: CodexRawDebugLogEntry,
): RuntimeRunDebugLogEntry {
  return {
    timestamp: entry.timestamp,
    source: entry.source,
    kind: entry.kind,
    raw: entry.raw,
    message: entry.message,
    data: entry.data ? { ...entry.data } : undefined,
  }
}

function readString(
  value: Record<string, unknown>,
  key: string,
): string | undefined {
  const field = value[key]

  return typeof field === 'string' ? field : undefined
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}
