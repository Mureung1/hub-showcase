import { readFile, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import {
  CodexStdioTransport,
  type CodexStdioTransportOptions,
} from '../stdio-transport.js'

export type FakeCodexStdioScenario =
  | 'bidirectional'
  | 'typed_client_responses'
  | 'safe_numeric_id_representations'
  | 'safe_numeric_server_request_representation'
  | 'duplicate_responses'
  | 'unknown_response'
  | 'malformed_json'
  | 'protocol_failure_then_messages'
  | 'ambiguous_message'
  | 'duplicate_protocol_key'
  | 'invalid_server_request_params'
  | 'unsafe_numeric_id'
  | 'unsafe_numeric_id_underflow'
  | 'unsafe_numeric_id_precision_loss'
  | 'unsafe_numeric_id_negative_zero'
  | 'late_response_after_timeout'
  | 'server_response_validation'
  | 'sequential_server_request_reuse'
  | 'dismissed_server_request_reuse'
  | 'duplicate_active_server_requests'
  | 'client_request_identity_limit'
  | 'exit_after_request'
  | 'stdout_eof'
  | 'stdin_failure'
  | 'hang'

export type FakeCodexStdioTransportInput = {
  scenario: FakeCodexStdioScenario
  ignoreSigterm?: boolean
  requestTimeoutMs?: number
  closeTimeoutMs?: number
  maxClientRequestIdentities?: number
}

export type FakeCodexStdioJournalEntry =
  | {
      kind: 'spawn'
      pid: number
    }
  | {
      kind: 'client_message'
      message: Record<string, unknown>
    }

export type FakeCodexStdioTransportFixture = {
  transport: CodexStdioTransport
  tempDir: string
  readJournal: (input?: {
    minimumEntries?: number
    timeoutMs?: number
  }) => Promise<FakeCodexStdioJournalEntry[]>
}

export async function withFakeCodexStdioTransport(
  input: FakeCodexStdioTransportInput,
  testBody: (fixture: FakeCodexStdioTransportFixture) => Promise<void>,
): Promise<void> {
  const tempDir = await mkdtemp(join(tmpdir(), 'ay-ple-codex-stdio-'))
  const scriptPath = join(tempDir, 'fake-codex-stdio.mjs')
  const journalPath = join(tempDir, 'journal.jsonl')
  await writeFile(scriptPath, createFakeCodexStdioSource(input))

  const transportOptions: CodexStdioTransportOptions = {
    command: process.execPath,
    args: [scriptPath, journalPath],
    cwd: tempDir,
    env: {
      PATH: process.env.PATH,
    },
    requestTimeoutMs: input.requestTimeoutMs ?? 1000,
    closeTimeoutMs: input.closeTimeoutMs ?? 100,
    maxClientRequestIdentities: input.maxClientRequestIdentities,
  }
  const transport = new CodexStdioTransport(transportOptions)
  const readJournal = createJournalReader(journalPath)

  try {
    await testBody({ transport, tempDir, readJournal })
  } finally {
    await transport.close()
    await rm(tempDir, { recursive: true, force: true })
  }
}

function createJournalReader(
  journalPath: string,
): FakeCodexStdioTransportFixture['readJournal'] {
  return async (input = {}) => {
    const minimumEntries = input.minimumEntries ?? 1
    const deadline = Date.now() + (input.timeoutMs ?? 1000)

    while (true) {
      const entries = await readJournalFile(journalPath)

      if (entries.length >= minimumEntries) {
        return entries
      }

      if (Date.now() >= deadline) {
        throw new Error(
          `Fake Codex stdio journal did not reach ${minimumEntries} entries`,
        )
      }

      await delay(5)
    }
  }
}

async function readJournalFile(
  journalPath: string,
): Promise<FakeCodexStdioJournalEntry[]> {
  let contents: string

  try {
    contents = await readFile(journalPath, 'utf8')
  } catch (error) {
    if (isNodeError(error) && error.code === 'ENOENT') {
      return []
    }

    throw error
  }

  const lines = contents.split('\n')

  if (!contents.endsWith('\n')) {
    lines.pop()
  }

  return lines
    .filter((line) => line.length > 0)
    .map((line) => JSON.parse(line) as FakeCodexStdioJournalEntry)
}

function createFakeCodexStdioSource(
  input: FakeCodexStdioTransportInput,
): string {
  return String.raw`
import { appendFileSync, closeSync } from 'node:fs'
import readline from 'node:readline'

const scenario = ${JSON.stringify(input.scenario)}
const ignoreSigterm = ${JSON.stringify(input.ignoreSigterm ?? false)}
const journalPath = process.argv[2]
const reader = readline.createInterface({ input: process.stdin })

if (ignoreSigterm) {
  process.on('SIGTERM', () => {})
}

journal({ kind: 'spawn', pid: process.pid })

reader.on('line', (line) => {
  const message = JSON.parse(line)
  journal({ kind: 'client_message', message })

  if (scenario === 'hang') {
    return
  }

  if (scenario === 'exit_after_request') {
    process.exit(23)
  }

  if (scenario === 'stdout_eof') {
    process.stdout.end()
    setInterval(() => {}, 1000)
    return
  }

  if (scenario === 'stdin_failure') {
    reader.close()
    closeSync(0)
    setInterval(() => {}, 1000)
    return
  }

  if (scenario === 'malformed_json') {
    process.stdout.write('{malformed\n')
    return
  }

  if (scenario === 'protocol_failure_then_messages') {
    process.stdout.write(
      '{malformed\n' +
        '{"method":"warning","params":{"message":"must not publish"}}\n' +
        '{"id":"late-server-request","method":"item/commandExecution/requestApproval","params":{"threadId":"thread-late","turnId":"turn-late","itemId":"item-late","startedAtMs":1,"environmentId":null,"command":"echo late"}}\n',
    )
    return
  }

  if (scenario === 'ambiguous_message') {
    write({ id: message.id, method: 'warning', result: {} })
    return
  }

  if (scenario === 'duplicate_protocol_key') {
    process.stdout.write(
      '{"id":1,"id":"1","result":{"ambiguous":true}}\n',
    )
    return
  }

  if (scenario === 'invalid_server_request_params') {
    write({
      id: message.id,
      method: 'item/tool/requestUserInput',
      params: {
        threadId: 'thread-invalid-params',
        turnId: 'turn-invalid-params',
        itemId: 'item-invalid-params',
        questions: [
          {
            id: 'question-invalid-params',
            header: 'Invalid',
            question: 'Should nested schema validation reject this?',
            isOther: false,
            isSecret: false,
            options: [42],
          },
        ],
        autoResolutionMs: null,
      },
    })
    return
  }

  if (scenario === 'unsafe_numeric_id') {
    process.stdout.write(
      '{"id":9007199254740993,"result":{"unsafe":true}}\n',
    )
    return
  }

  if (scenario === 'unsafe_numeric_id_underflow') {
    process.stdout.write('{"id":1e-324,"result":{"unsafe":true}}\n')
    return
  }

  if (scenario === 'unsafe_numeric_id_precision_loss') {
    process.stdout.write(
      '{"id":1.0000000000000001,"result":{"unsafe":true}}\n',
    )
    return
  }

  if (scenario === 'unsafe_numeric_id_negative_zero') {
    process.stdout.write('{"id":-0.0,"result":{"unsafe":true}}\n')
    return
  }

  if (scenario === 'safe_numeric_id_representations') {
    if (message.id === 1) {
      process.stdout.write('{"id":1.0,"result":{"identity":"decimal"}}\n')
      return
    }

    if (message.id === 2) {
      process.stdout.write(
        '{"id":2e0000000,"result":{"identity":"zero-padded-exponent"}}\n',
      )
      return
    }

    if (message.id === 1000) {
      process.stdout.write('{"id":1e3,"result":{"identity":"exponent"}}\n')
      return
    }
  }

  if (
    scenario === 'safe_numeric_server_request_representation' &&
    message.method === 'initialize'
  ) {
    globalThis.pendingClientResponseId = message.id
    process.stdout.write(
      '{"id":1e3,"method":"item/commandExecution/requestApproval","params":{"threadId":"thread-numeric-server","turnId":"turn-numeric-server","itemId":"item-numeric-server","startedAtMs":1,"environmentId":null,"command":"echo numeric"}}\n',
    )
    return
  }

  if (
    scenario === 'safe_numeric_server_request_representation' &&
    message.id === 1000 &&
    message.result
  ) {
    write({
      id: globalThis.pendingClientResponseId,
      result: { userAgent: 'fake-numeric-server-codex' },
    })
    return
  }

  if (scenario === 'late_response_after_timeout') {
    if (!Object.hasOwn(message, 'id')) {
      return
    }

    if (globalThis.timedOutClientRequestId === undefined) {
      globalThis.timedOutClientRequestId = message.id
      return
    }

    write({
      id: globalThis.timedOutClientRequestId,
      result: { arrived: 'late' },
    })
    write({ id: message.id, result: { request: message.id } })
    return
  }

  if (scenario === 'client_request_identity_limit') {
    if (message.id === 1 || message.id === 3) {
      write({ id: message.id, result: { request: message.id } })
    }
    return
  }

  if (
    scenario === 'server_response_validation' &&
    message.method === 'initialize'
  ) {
    globalThis.pendingClientResponseId = message.id
    write(commandApprovalRequest({
      id: 'approval-response-validation',
      threadId: 'thread-response-validation',
      turnId: 'turn-response-validation',
      itemId: 'item-response-validation',
      startedAtMs: 1,
      command: 'echo validate response',
    }))
    return
  }

  if (
    scenario === 'sequential_server_request_reuse' &&
    message.method === 'initialize'
  ) {
    globalThis.pendingClientResponseId = message.id
    write(commandApprovalRequest({
      id: 'reused-server-request',
      threadId: 'thread-server-reuse',
      turnId: 'turn-server-reuse',
      itemId: 'item-server-reuse-1',
      startedAtMs: 1,
      command: 'echo first',
    }))
    return
  }

  if (
    scenario === 'dismissed_server_request_reuse' &&
    message.method === 'initialize'
  ) {
    globalThis.pendingClientResponseId = message.id
    write(commandApprovalRequest({
      id: 'dismissed-server-request',
      threadId: 'thread-server-dismiss',
      turnId: 'turn-server-dismiss',
      itemId: 'item-server-dismiss-1',
      startedAtMs: 1,
      command: 'echo dismissed',
    }))
    return
  }

  if (
    scenario === 'duplicate_active_server_requests' &&
    message.method === 'initialize'
  ) {
    const request = commandApprovalRequest({
      id: 'duplicate-active-server-request',
      threadId: 'thread-server-duplicate',
      turnId: 'turn-server-duplicate',
      itemId: 'item-server-duplicate',
      startedAtMs: 1,
      command: 'echo duplicate',
    })
    write(request)
    write(request)
    return
  }

  if (
    scenario === 'dismissed_server_request_reuse' &&
    message.method === 'initialized'
  ) {
    write(commandApprovalRequest({
      id: 'dismissed-server-request',
      threadId: 'thread-server-dismiss',
      turnId: 'turn-server-dismiss',
      itemId: 'item-server-dismiss-2',
      startedAtMs: 2,
      command: 'echo reused after dismiss',
    }))
    return
  }

  if (
    scenario === 'dismissed_server_request_reuse' &&
    message.id === 'dismissed-server-request' &&
    message.result
  ) {
    write({
      id: globalThis.pendingClientResponseId,
      result: { userAgent: 'fake-server-dismiss-codex' },
    })
    return
  }

  if (
    scenario === 'sequential_server_request_reuse' &&
    message.id === 'reused-server-request' &&
    (message.result || message.error)
  ) {
    if (globalThis.serverResponseCount === undefined) {
      globalThis.serverResponseCount = 1
      write(commandApprovalRequest({
        id: 'reused-server-request',
        threadId: 'thread-server-reuse',
        turnId: 'turn-server-reuse',
        itemId: 'item-server-reuse-2',
        startedAtMs: 2,
        command: 'echo second',
      }))
      return
    }

    write({
      id: globalThis.pendingClientResponseId,
      result: { userAgent: 'fake-server-reuse-codex' },
    })
    return
  }

  if (
    scenario === 'server_response_validation' &&
    message.id === 'approval-response-validation' &&
    message.result
  ) {
    write({
      id: globalThis.pendingClientResponseId,
      result: { userAgent: 'fake-response-validation-codex' },
    })
    return
  }

  if (scenario === 'duplicate_responses') {
    if (message.id === 1) {
      write({ id: 1, result: { request: 1 } })
      write({ id: 1, result: { duplicate: true } })
    }
    return
  }

  if (scenario === 'unknown_response') {
    write({ id: 'not-pending', result: { unexpected: true } })
    return
  }

  if (scenario === 'typed_client_responses') {
    if (typeof message.id === 'number') {
      globalThis.numericClientRequestId = message.id
      return
    }

    if (typeof message.id === 'string') {
      write({ id: message.id, result: { identity: 'string' } })
      write({
        id: globalThis.numericClientRequestId,
        result: { identity: 'number' },
      })
    }
    return
  }

  if (scenario === 'bidirectional' && message.method === 'initialize') {
    write(commandApprovalRequest({
      id: message.id,
      threadId: 'thread-transport',
      turnId: 'turn-transport',
      itemId: 'item-transport',
      startedAtMs: 1,
      command: 'echo fixture',
    }))
    write(commandApprovalRequest({
      id: String(message.id),
      threadId: 'thread-transport',
      turnId: 'turn-transport',
      itemId: 'item-transport-string',
      startedAtMs: 2,
      command: 'echo string fixture',
    }))
    write({ method: 'warning', params: { message: 'fixture warning' } })
    return
  }

  if (
    scenario === 'bidirectional' &&
    typeof message.id === 'number' &&
    message.result
  ) {
    write({ id: message.id, result: { userAgent: 'fake-bidirectional-codex' } })
  }
})

function commandApprovalRequest({
  id,
  threadId,
  turnId,
  itemId,
  startedAtMs,
  command,
}) {
  return {
    id,
    method: 'item/commandExecution/requestApproval',
    params: {
      threadId,
      turnId,
      itemId,
      startedAtMs,
      environmentId: null,
      command,
    },
  }
}

function write(message) {
  process.stdout.write(JSON.stringify(message) + '\n')
}

function journal(entry) {
  appendFileSync(journalPath, JSON.stringify(entry) + '\n')
}
`
}

function isNodeError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error
}

function delay(ms: number): Promise<void> {
  return new Promise((resolvePromise) => setTimeout(resolvePromise, ms))
}
