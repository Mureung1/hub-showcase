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
  | 'duplicate_responses'
  | 'unknown_response'
  | 'malformed_json'
  | 'ambiguous_message'
  | 'invalid_server_request_params'
  | 'exit_after_request'
  | 'stdout_eof'
  | 'stdin_failure'
  | 'hang'

export type FakeCodexStdioTransportInput = {
  scenario: FakeCodexStdioScenario
  ignoreSigterm?: boolean
  requestTimeoutMs?: number
  closeTimeoutMs?: number
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

  if (scenario === 'ambiguous_message') {
    write({ id: message.id, method: 'warning', result: {} })
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
    write({
      id: message.id,
      method: 'item/commandExecution/requestApproval',
      params: {
        threadId: 'thread-transport',
        turnId: 'turn-transport',
        itemId: 'item-transport',
        startedAtMs: 1,
        environmentId: null,
        command: 'echo fixture',
      },
    })
    write({
      id: String(message.id),
      method: 'item/commandExecution/requestApproval',
      params: {
        threadId: 'thread-transport',
        turnId: 'turn-transport',
        itemId: 'item-transport-string',
        startedAtMs: 2,
        environmentId: null,
        command: 'echo string fixture',
      },
    })
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
