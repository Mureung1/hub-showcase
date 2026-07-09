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
      void client.close()
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
      const turnScope: CodexTurnScope = {
        threadId: thread.threadId,
        turnId: turn.turnId,
      }
      const turnDebugLog = emitDebugLog()

      if (turnDebugLog) {
        yield turnDebugLog
      }

      if (input.signal.aborted) {
        return
      }

      const notifications = client.notifications()[Symbol.asyncIterator]()

      while (!input.signal.aborted) {
        const notification = await nextNotificationOrAbort(
          notifications,
          input.signal,
        )

        if (notification === 'aborted') {
          return
        }

        if (notification.done) {
          throw new Error('Codex notification stream ended before turn completed')
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

        if (isMatchingCompletedTurn(notification.value, turnScope)) {
          await client.close()

          const completedDebugLog = emitDebugLog()

          if (completedDebugLog) {
            yield completedDebugLog
          }

          yield { type: 'completed' }

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

async function nextNotificationOrAbort(
  notifications: AsyncIterator<CodexRawServerNotification>,
  signal: AbortSignal,
): Promise<
  IteratorResult<CodexRawServerNotification> | 'aborted'
> {
  if (signal.aborted) {
    return 'aborted'
  }

  let abortListener = () => {}
  const abortPromise = new Promise<'aborted'>((resolve) => {
    abortListener = () => resolve('aborted')
    signal.addEventListener('abort', abortListener, { once: true })
  })

  try {
    return await Promise.race([notifications.next(), abortPromise])
  } finally {
    signal.removeEventListener('abort', abortListener)
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

function isMatchingCompletedTurn(
  notification: CodexRawServerNotification,
  turnScope: CodexTurnScope,
): boolean {
  if (notification.method !== 'turn/completed') {
    return false
  }

  const params = notificationParams(notification)

  if (!params || readString(params, 'threadId') !== turnScope.threadId) {
    return false
  }

  const turn = params.turn

  return (
    isRecord(turn) &&
    readString(turn, 'id') === turnScope.turnId &&
    readString(turn, 'status') === 'completed'
  )
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
