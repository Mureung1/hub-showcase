import assert from 'node:assert/strict'
import { once } from 'node:events'
import type { Server } from 'node:http'
import type { AddressInfo } from 'node:net'
import { setTimeout as delay } from 'node:timers/promises'
import { pathToFileURL } from 'node:url'
import {
  isTerminalRuntimeRunStatus,
  type RuntimeRunEvent,
  type RuntimeRunLog,
  type RuntimeRunSummary,
} from '@ay-ple/runtime-core'
import type { CodexRuntimeStatus } from '@ay-ple/runtime-codex'
import {
  hasCodexDebugClientRequest,
  hasCodexDebugNotification,
  hasCodexDebugTurnCompletionStatus,
  type CodexDebugClientRequestMethod,
} from '@ay-ple/runtime-codex/testing'
import { createServerApp } from './server.js'

type VerificationOptions = {
  timeoutMs?: number
}

type ReadyCodexRuntimeStatus = Extract<CodexRuntimeStatus, { ok: true }>

export type CodexParityScenarioResult = {
  runId: string
  status: 'completed' | 'cancelled'
  eventTypes: RuntimeRunEvent['type'][]
  debugEvidenceCount: number
}

export type CodexParityVerificationResult = {
  status: ReadyCodexRuntimeStatus
  prompt: CodexParityScenarioResult
  cancellation: CodexParityScenarioResult
}

const defaultParityTimeoutMs = 60000
const promptParityInput =
  'Reply with exactly AY-PLE_CODEX_PARITY_OK and do not use tools.'
const cancellationParityInput =
  'Output integers from 1 through 100000, one integer per line. Do not summarize or stop early.'

export async function runCodexParityVerification(
  baseUrl: string,
  options: VerificationOptions = {},
): Promise<CodexParityVerificationResult> {
  return withVerificationTimeout(options.timeoutMs, async (signal) => ({
    status: await verifyCodexPreflightInternal(baseUrl, signal),
    prompt: await verifyCodexPromptParityInternal(baseUrl, signal),
    cancellation: await verifyCodexCancellationParityInternal(baseUrl, signal),
  }))
}

export async function verifyCodexPreflight(
  baseUrl: string,
  options: VerificationOptions = {},
): Promise<ReadyCodexRuntimeStatus> {
  return withVerificationTimeout(options.timeoutMs, (signal) =>
    verifyCodexPreflightInternal(baseUrl, signal),
  )
}

export async function verifyCodexPromptParity(
  baseUrl: string,
  options: VerificationOptions = {},
): Promise<CodexParityScenarioResult> {
  return withVerificationTimeout(options.timeoutMs, (signal) =>
    verifyCodexPromptParityInternal(baseUrl, signal),
  )
}

export async function verifyCodexCancellationParity(
  baseUrl: string,
  options: VerificationOptions = {},
): Promise<CodexParityScenarioResult> {
  return withVerificationTimeout(options.timeoutMs, (signal) =>
    verifyCodexCancellationParityInternal(baseUrl, signal),
  )
}

export function parseCodexParityTimeout(value: string | undefined): number {
  if (value === undefined) {
    return defaultParityTimeoutMs
  }

  const timeoutMs = Number(value)

  if (!Number.isInteger(timeoutMs) || timeoutMs < 1) {
    throw new Error('CODEX_PARITY_TIMEOUT_MS must be a positive integer')
  }

  return timeoutMs
}

async function verifyCodexPreflightInternal(
  baseUrl: string,
  signal: AbortSignal,
): Promise<ReadyCodexRuntimeStatus> {
  const status = await requestJson<CodexRuntimeStatus>(
    `${baseUrl}/api/runtime/codex/status`,
    {},
    200,
    signal,
  )

  if (!status.ok) {
    throw new Error(`Codex status preflight failed: ${status.error}`)
  }

  assert.equal(
    status.versionMatchesPin,
    true,
    `Codex binary version ${status.version ?? 'unknown'} does not match package pin ${status.pinnedVersion}`,
  )

  return status
}

async function verifyCodexPromptParityInternal(
  baseUrl: string,
  signal: AbortSignal,
): Promise<CodexParityScenarioResult> {
  const runId = await startCodexRun(baseUrl, promptParityInput, signal)
  const events = await collectRunEvents(baseUrl, runId, signal)
  const log = await fetchRunLog(baseUrl, runId, signal)

  assertLifecycle(events, runId, ['started', 'output_delta', 'completed'])
  assert.equal(log.status, 'completed', 'Codex prompt run did not complete')
  assert.ok(log.output.length > 0, 'Codex prompt run produced no output')
  assert.deepEqual(log.events, events, 'Run log and SSE events diverged')
  assertRequestEvidence(log, 'initialize')
  assertRequestEvidence(log, 'thread/start')
  assertRequestEvidence(log, 'turn/start')
  assert.ok(
    hasCodexDebugNotification(log.debugLog, 'turn/completed'),
    'Codex debug log omitted turn/completed notification evidence',
  )
  await assertHistoryStatus(baseUrl, runId, 'completed', signal)

  return summarizeScenario(log, events, 'completed')
}

async function verifyCodexCancellationParityInternal(
  baseUrl: string,
  signal: AbortSignal,
): Promise<CodexParityScenarioResult> {
  const runId = await startCodexRun(baseUrl, cancellationParityInput, signal)

  await waitForCancellableTurn(baseUrl, runId, signal)

  const { run: cancellingRun } = await requestJson<{ run: RuntimeRunLog }>(
    `${baseUrl}/api/runtime/runs/${runId}/cancel`,
    { method: 'POST' },
    200,
    signal,
  )

  assert.equal(
    cancellingRun.status,
    'cancelling',
    'Codex cancellation request did not enter cancelling state',
  )

  const events = await collectRunEvents(baseUrl, runId, signal)
  const log = await fetchRunLog(baseUrl, runId, signal)

  assertLifecycle(events, runId, ['started', 'cancelling', 'cancelled'])
  assert.equal(log.status, 'cancelled', 'Codex run was not cancelled')
  assert.deepEqual(log.events, events, 'Run log and SSE events diverged')
  assertRequestEvidence(log, 'turn/interrupt')
  assert.ok(
    hasCodexDebugTurnCompletionStatus(log.debugLog, 'interrupted'),
    'Codex debug log omitted interrupted turn completion evidence',
  )
  await assertHistoryStatus(baseUrl, runId, 'cancelled', signal)

  return summarizeScenario(log, events, 'cancelled')
}

async function startCodexRun(
  baseUrl: string,
  prompt: string,
  signal: AbortSignal,
): Promise<string> {
  const body = await requestJson<{ runId?: unknown }>(
    `${baseUrl}/api/runtime/runs`,
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ adapter: 'codex', prompt }),
    },
    201,
    signal,
  )

  if (typeof body.runId !== 'string') {
    throw new Error('Codex run start returned no runId')
  }

  return body.runId
}

async function collectRunEvents(
  baseUrl: string,
  runId: string,
  signal: AbortSignal,
): Promise<RuntimeRunEvent[]> {
  const response = await fetch(
    `${baseUrl}/api/runtime/runs/${runId}/events?after=0`,
    { signal },
  )
  const stream = await response.text()

  assert.equal(
    response.status,
    200,
    `Codex run event stream failed: ${stream}`,
  )

  const events = stream
    .split('\n')
    .filter((line) => line.startsWith('data: '))
    .map(
      (line) =>
        JSON.parse(line.slice('data: '.length)) as RuntimeRunEvent,
    )

  assert.ok(events.length > 0, 'Codex run event stream was empty')

  return events
}

async function fetchRunLog(
  baseUrl: string,
  runId: string,
  signal: AbortSignal,
): Promise<RuntimeRunLog> {
  const body = await requestJson<{ run: RuntimeRunLog }>(
    `${baseUrl}/api/runtime/runs/${runId}`,
    {},
    200,
    signal,
  )

  return body.run
}

async function waitForCancellableTurn(
  baseUrl: string,
  runId: string,
  signal: AbortSignal,
): Promise<void> {
  while (!signal.aborted) {
    const log = await fetchRunLog(baseUrl, runId, signal)

    const turnStarted = hasCodexDebugNotification(log.debugLog, 'turn/started')
    const outputStarted = log.events.some(
      (event) => event.type === 'output_delta',
    )

    if (
      hasCodexDebugClientRequest(log.debugLog, 'turn/start') &&
      turnStarted &&
      outputStarted
    ) {
      assert.ok(
        !isTerminalRuntimeRunStatus(log.status),
        `Codex run reached ${log.status} before cancellation`,
      )
      return
    }

    assert.ok(
      !isTerminalRuntimeRunStatus(log.status),
      `Codex run reached ${log.status} before it became cancellable`,
    )
    await delay(25, undefined, { signal })
  }
}

async function assertHistoryStatus(
  baseUrl: string,
  runId: string,
  expectedStatus: 'completed' | 'cancelled',
  signal: AbortSignal,
): Promise<void> {
  const { runs } = await requestJson<{ runs: RuntimeRunSummary[] }>(
    `${baseUrl}/api/runtime/runs`,
    {},
    200,
    signal,
  )
  const matchingRuns = runs.filter((run) => run.runId === runId)

  assert.equal(matchingRuns.length, 1, 'Run history did not contain one run')
  assert.equal(matchingRuns[0]?.status, expectedStatus)
  assert.ok(
    matchingRuns.every((run) => isTerminalRuntimeRunStatus(run.status)),
    'Run history retained non-terminal residue',
  )
}

function assertLifecycle(
  events: RuntimeRunEvent[],
  runId: string,
  requiredTypes: RuntimeRunEvent['type'][],
): void {
  const terminalEvent = events.at(-1)

  if (terminalEvent?.type === 'failed') {
    throw new Error(`Codex run failed: ${terminalEvent.error}`)
  }

  assert.equal(events[0]?.type, 'started')
  assert.equal(terminalEvent?.type, requiredTypes.at(-1))

  let previousIndex = -1

  for (const type of requiredTypes) {
    const index = events.findIndex(
      (event, candidate) => candidate > previousIndex && event.type === type,
    )
    assert.ok(index >= 0, `Codex event stream omitted ${type}`)
    previousIndex = index
  }

  for (const [index, event] of events.entries()) {
    assert.equal(event.runId, runId)
    assert.equal(event.adapter, 'codex')
    assert.equal(event.sequence, index + 1)
  }
}

function assertRequestEvidence(
  log: RuntimeRunLog,
  method: CodexDebugClientRequestMethod,
): void {
  assert.ok(
    hasCodexDebugClientRequest(log.debugLog, method),
    `Codex debug log omitted ${method} request evidence`,
  )
}

function summarizeScenario(
  log: RuntimeRunLog,
  events: RuntimeRunEvent[],
  status: 'completed' | 'cancelled',
): CodexParityScenarioResult {
  return {
    runId: log.runId,
    status,
    eventTypes: events.map((event) => event.type),
    debugEvidenceCount: log.debugLog?.length ?? 0,
  }
}

async function requestJson<T>(
  url: string,
  init: RequestInit,
  expectedStatus: number,
  signal: AbortSignal,
): Promise<T> {
  const response = await fetch(url, { ...init, signal })
  const text = await response.text()
  let body: unknown

  try {
    body = JSON.parse(text) as unknown
  } catch {
    throw new Error(`Expected JSON from ${url}, received HTTP ${response.status}`)
  }

  const detail =
    isRecord(body) && typeof body.error === 'string' ? body.error : text

  assert.equal(
    response.status,
    expectedStatus,
    `HTTP ${response.status} from ${url}: ${detail}`,
  )

  return body as T
}

async function withVerificationTimeout<T>(
  timeoutMs: number | undefined,
  run: (signal: AbortSignal) => Promise<T>,
): Promise<T> {
  const resolvedTimeoutMs = timeoutMs ?? defaultParityTimeoutMs

  if (!Number.isInteger(resolvedTimeoutMs) || resolvedTimeoutMs < 1) {
    throw new Error('Codex parity timeout must be a positive integer')
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), resolvedTimeoutMs)

  try {
    return await run(controller.signal)
  } catch (error) {
    if (controller.signal.aborted) {
      throw new Error(
        `Codex parity verification timed out after ${resolvedTimeoutMs}ms`,
      )
    }

    throw error
  } finally {
    clearTimeout(timeout)
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

async function startServer(): Promise<Server> {
  const server = createServerApp().listen(0, '127.0.0.1')

  await once(server, 'listening')

  return server
}

async function closeServer(server: Server): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    server.close((error) => {
      if (error) {
        reject(error)
        return
      }

      resolve()
    })
    server.closeAllConnections()
  })
}

function printResult(result: CodexParityVerificationResult): void {
  console.log('Live Codex HTTP/SSE parity succeeded.')
  console.log(`Codex binary: ${result.status.codexBinPath}`)
  console.log(
    `Codex version: ${result.status.version} (pin ${result.status.pinnedVersion})`,
  )
  console.log(`CODEX_HOME: ${result.status.runtimeHome.codexHome}`)
  console.log(`CODEX_SQLITE_HOME: ${result.status.runtimeHome.codexSqliteHome}`)

  for (const [label, scenario] of [
    ['Prompt', result.prompt],
    ['Cancellation', result.cancellation],
  ] as const) {
    console.log(
      `${label}: ${scenario.status} run=${scenario.runId} events=${scenario.eventTypes.join(' -> ')} debug=${scenario.debugEvidenceCount}`,
    )
  }
}

async function main(): Promise<void> {
  const timeoutMs = parseCodexParityTimeout(process.env.CODEX_PARITY_TIMEOUT_MS)
  const server = await startServer()

  try {
    const address = server.address() as AddressInfo
    const result = await runCodexParityVerification(
      `http://127.0.0.1:${address.port}`,
      { timeoutMs },
    )

    printResult(result)
  } finally {
    await closeServer(server)
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error: unknown) => {
    console.error('Live Codex HTTP/SSE parity failed.')
    console.error(error instanceof Error ? error.message : String(error))
    console.error('No OAuth or login command was run.')
    process.exitCode = 1
  })
}
