import assert from 'node:assert/strict'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'
import {
  CodexRawClient,
  ensureCodexRuntimeHome,
  resolveDefaultCodexRuntimeHome,
  runCodexInitializeSmoke,
  type CodexRawDebugLogEntry,
} from './index.js'
import { withFakeCodexAppServer } from './testing/fake-codex-app-server.js'

test('default Codex runtime home is workspace-local', () => {
  const workspaceRoot = resolve(
    dirname(fileURLToPath(import.meta.url)),
    '../../..',
  )
  const runtimeHome = resolveDefaultCodexRuntimeHome()

  assert.deepEqual(runtimeHome, {
    codexHome: join(workspaceRoot, '.ay-ple/runtime-codex/codex-home'),
    codexSqliteHome: join(workspaceRoot, '.ay-ple/runtime-codex/sqlite'),
  })
})

test('ensureCodexRuntimeHome can prepare file-based auth config', async () => {
  const tempDir = await mkdtemp(join(tmpdir(), 'ay-ple-codex-runtime-home-'))
  const runtimeHome = {
    codexHome: join(tempDir, 'codex-home'),
    codexSqliteHome: join(tempDir, 'sqlite'),
  }

  try {
    ensureCodexRuntimeHome(runtimeHome, { fileAuthConfig: true })

    const config = await readFile(
      join(runtimeHome.codexHome, 'config.toml'),
      'utf8',
    )

    assert.match(config, /^cli_auth_credentials_store = "file"$/m)
  } finally {
    await rm(tempDir, { recursive: true, force: true })
  }
})

test('CodexRawClient interrupts a turn over stdio JSONL', async () => {
  await withFakeCodexAppServer(
    {
      threadId: 'thread-raw-interrupt',
      turnId: 'turn-raw-interrupt',
      turnCompletions: [],
    },
    async ({ rawClientOptions }) => {
      const client = new CodexRawClient(rawClientOptions)

      try {
        await client.initialize()
        const thread = await client.startThread()
        const turn = await client.startTurn({
          threadId: thread.threadId,
          input: [
            {
              type: 'text',
              text: 'stop this turn',
              text_elements: [],
            },
          ],
        })
        const result = await client.interruptTurn({
          threadId: thread.threadId,
          turnId: turn.turnId,
        })
        const outboundMessages = readOutboundClientMessages(client.getDebugLog())
        const interruptRequest = outboundMessages.find(
          (message) => message.method === 'turn/interrupt',
        )

        assert.deepEqual(result, {})
        assert.deepEqual(interruptRequest?.params, {
          threadId: 'thread-raw-interrupt',
          turnId: 'turn-raw-interrupt',
        })
      } finally {
        await client.close()
      }
    },
  )
})

test('CodexRawClient exposes broad shallow raw capability wrappers over stdio JSONL', async () => {
  await withFakeCodexAppServer(
    {
      threadId: 'thread-raw-slots',
      turnId: 'turn-raw-slots',
      turnCompletions: [],
    },
    async ({ rawClientOptions }) => {
      const client = new CodexRawClient(rawClientOptions)

      try {
        await client.initialize()

        const steer = await client.steerTurn({
          threadId: 'thread-raw-slots',
          expectedTurnId: 'turn-raw-slots',
          clientUserMessageId: 'message-raw-steer',
          input: [
            {
              type: 'text',
              text: 'steer this turn',
              text_elements: [],
            },
          ],
        })
        const threads = await client.listThreads({
          limit: 2,
          searchTerm: 'raw slots',
        })
        const loadedThreads = await client.listLoadedThreads({ limit: 1 })
        const readThread = await client.readThread({
          threadId: 'thread-raw-slots',
          includeTurns: true,
        })
        const outboundMessages = readOutboundClientMessages(client.getDebugLog())

        assert.deepEqual(steer, { turnId: 'turn-raw-slots' })
        assert.equal(threads.data.length, 1)
        assert.equal(threads.nextCursor, null)
        assert.deepEqual(loadedThreads, {
          data: ['thread-raw-slots'],
          nextCursor: null,
        })
        assert.equal(readThread.thread.id, 'thread-raw-slots')

        assert.deepEqual(
          outboundMessages.find((message) => message.method === 'turn/steer')
            ?.params,
          {
            threadId: 'thread-raw-slots',
            expectedTurnId: 'turn-raw-slots',
            clientUserMessageId: 'message-raw-steer',
            input: [
              {
                type: 'text',
                text: 'steer this turn',
                text_elements: [],
              },
            ],
          },
        )
        assert.deepEqual(
          outboundMessages.find((message) => message.method === 'thread/list')
            ?.params,
          {
            limit: 2,
            searchTerm: 'raw slots',
          },
        )
        assert.deepEqual(
          outboundMessages.find(
            (message) => message.method === 'thread/loaded/list',
          )?.params,
          {
            limit: 1,
          },
        )
        assert.deepEqual(
          outboundMessages.find((message) => message.method === 'thread/read')
            ?.params,
          {
            threadId: 'thread-raw-slots',
            includeTurns: true,
          },
        )
      } finally {
        await client.close()
      }
    },
  )
})

test('CodexRawClient reads auth status without exposing tokens by default', async () => {
  await withFakeCodexAppServer(
    {
      authStatus: {
        authMethod: 'chatgpt',
        authToken: 'fake-token',
        requiresOpenaiAuth: true,
      },
    },
    async ({ rawClientOptions }) => {
      const client = new CodexRawClient(rawClientOptions)

      try {
        await client.initialize()

        const status = await client.getAuthStatus()
        const outboundMessages = readOutboundClientMessages(client.getDebugLog())

        assert.deepEqual(status, {
          authMethod: 'chatgpt',
          authToken: null,
          requiresOpenaiAuth: true,
        })
        assert.deepEqual(
          outboundMessages.find(
            (message) => message.method === 'getAuthStatus',
          )?.params,
          {
            includeToken: false,
            refreshToken: false,
          },
        )
      } finally {
        await client.close()
      }
    },
  )
})

test('CodexRawClient performs initialize and initialized over stdio JSONL', async () => {
  await withFakeAppServer(async ({ scriptPath, tempDir }) => {
    const codexHome = join(tempDir, 'codex-home')
    const codexSqliteHome = join(tempDir, 'sqlite')
    const previousOpenAiApiKey = process.env.OPENAI_API_KEY
    const previousGitHubToken = process.env.GITHUB_TOKEN
    process.env.OPENAI_API_KEY = 'global-secret'
    process.env.GITHUB_TOKEN = 'global-token'

    const client = new CodexRawClient({
      codexBinPath: process.execPath,
      codexArgs: [scriptPath, 'app-server', '--listen', 'stdio://'],
      cwd: tempDir,
      codexHome,
      codexSqliteHome,
      timeoutMs: 1000,
    })

    try {
      const result = await client.initialize()
      const initializedEntry = await waitForDebugEntry(
        () => client.getDebugLog(),
        (entry) =>
          entry.source === 'server' &&
          entry.kind === 'stderr' &&
          entry.raw === 'fake app-server observed initialized',
      )

      assert.equal(
        result.response.userAgent,
        `fake-codex ${scriptPath} app-server --listen stdio://`,
      )
      assert.equal(result.response.codexHome, codexHome)
      assert.equal(result.response.platformFamily, codexSqliteHome)
      assert.equal(
        result.response.platformOs,
        'missing/missing',
        'token-like environment variables are not inherited by default',
      )

      const debugLog = client.getDebugLog()
      const spawnEntry = requireDebugEntry(debugLog, 'spawn')
      assert.deepEqual(spawnEntry.data?.args, [
        scriptPath,
        'app-server',
        '--listen',
        'stdio://',
      ])

      const outboundMessages = debugLog
        .filter((entry) => entry.source === 'client' && entry.kind === 'stdin')
        .map((entry) => JSON.parse(entry.raw ?? '{}') as { method?: string })

      assert.deepEqual(
        outboundMessages.map((message) => message.method),
        ['initialize', 'initialized'],
      )
      assert.ok(
        debugLog.some(
          (entry) =>
            entry.source === 'server' &&
            entry.kind === 'stderr' &&
            entry.raw === 'fake app-server observed initialize',
        ),
      )
      assert.equal(initializedEntry.raw, 'fake app-server observed initialized')
    } finally {
      await client.close()

      if (previousOpenAiApiKey === undefined) {
        delete process.env.OPENAI_API_KEY
      } else {
        process.env.OPENAI_API_KEY = previousOpenAiApiKey
      }

      if (previousGitHubToken === undefined) {
        delete process.env.GITHUB_TOKEN
      } else {
        process.env.GITHUB_TOKEN = previousGitHubToken
      }
    }
  })
})

test('CodexRawClient allows explicit token-like environment overrides', async () => {
  await withFakeAppServer(async ({ scriptPath, tempDir }) => {
    const result = await runCodexInitializeSmoke({
      codexBinPath: process.execPath,
      codexArgs: [scriptPath],
      cwd: tempDir,
      codexHome: join(tempDir, 'codex-home'),
      codexSqliteHome: join(tempDir, 'sqlite'),
      timeoutMs: 1000,
      env: {
        OPENAI_API_KEY: 'explicit-secret',
      },
    })

    assert.equal(result.ok, true)

    if (result.ok) {
      assert.equal(result.response.platformOs, 'explicit-secret/missing')
    }
  })
})

test('runCodexInitializeSmoke returns a failed result on initialize timeout', async () => {
  await withFakeAppServer(async ({ scriptPath, tempDir }) => {
    const result = await runCodexInitializeSmoke({
      codexBinPath: process.execPath,
      codexArgs: [scriptPath, '--hang'],
      cwd: tempDir,
      codexHome: join(tempDir, 'codex-home'),
      codexSqliteHome: join(tempDir, 'sqlite'),
      timeoutMs: 50,
    })

    assert.equal(result.ok, false)

    if (!result.ok) {
      assert.match(result.error, /initialize timed out/)
    }

    assert.ok(result.debugLog.some((entry) => entry.kind === 'timeout'))
  })
})

test('runCodexInitializeSmoke returns a failed result when app-server exits early', async () => {
  await withFakeAppServer(async ({ scriptPath, tempDir }) => {
    const result = await runCodexInitializeSmoke({
      codexBinPath: process.execPath,
      codexArgs: [scriptPath, '--exit-after-initialize'],
      cwd: tempDir,
      codexHome: join(tempDir, 'codex-home'),
      codexSqliteHome: join(tempDir, 'sqlite'),
      timeoutMs: 1000,
    })

    assert.equal(result.ok, false)

    if (!result.ok) {
      assert.match(result.error, /exited before completing pending requests/)
    }

    assert.ok(result.debugLog.some((entry) => entry.kind === 'exit'))
  })
})

async function withFakeAppServer(
  testBody: (fixture: { scriptPath: string; tempDir: string }) => Promise<void>,
): Promise<void> {
  const tempDir = await mkdtemp(join(tmpdir(), 'ay-ple-codex-raw-client-'))
  const scriptPath = join(tempDir, 'fake-app-server.mjs')

  await writeFile(scriptPath, fakeAppServerSource)

  try {
    await testBody({ scriptPath, tempDir })
  } finally {
    await rm(tempDir, { recursive: true, force: true })
  }
}

function requireDebugEntry(
  debugLog: CodexRawDebugLogEntry[],
  kind: CodexRawDebugLogEntry['kind'],
): CodexRawDebugLogEntry {
  const entry = debugLog.find((candidate) => candidate.kind === kind)

  assert.ok(entry, `expected debug entry kind ${kind}`)

  return entry
}

function readOutboundClientMessages(
  debugLog: CodexRawDebugLogEntry[],
): Array<{ method?: string; params?: unknown }> {
  return debugLog
    .filter((entry) => entry.source === 'client' && entry.kind === 'stdin')
    .map(
      (entry) =>
        JSON.parse(entry.raw ?? '{}') as {
          method?: string
          params?: unknown
        },
    )
}

async function waitForDebugEntry(
  getDebugLog: () => CodexRawDebugLogEntry[],
  predicate: (entry: CodexRawDebugLogEntry) => boolean,
): Promise<CodexRawDebugLogEntry> {
  const deadline = Date.now() + 500

  while (Date.now() < deadline) {
    const entry = getDebugLog().find(predicate)

    if (entry) {
      return entry
    }

    await yieldToEventLoop()
  }

  assert.fail('expected debug entry was not observed')
}

function yieldToEventLoop(): Promise<void> {
  return new Promise((resolve) => {
    setImmediate(resolve)
  })
}

const fakeAppServerSource = String.raw`
import readline from 'node:readline'

const args = process.argv.slice(1)
const shouldHang = args.includes('--hang')
const shouldExitAfterInitialize = args.includes('--exit-after-initialize')
const reader = readline.createInterface({ input: process.stdin })

reader.on('line', (line) => {
  const message = JSON.parse(line)

  if (message.method === 'initialize') {
    process.stderr.write('fake app-server observed initialize\n')

    if (shouldExitAfterInitialize) {
      process.exit(7)
    }

    if (shouldHang) {
      return
    }

    const response = {
      id: message.id,
      result: {
        userAgent: 'fake-codex ' + args.join(' '),
        codexHome: process.env.CODEX_HOME ?? '',
        platformFamily: process.env.CODEX_SQLITE_HOME ?? '',
        platformOs:
          (process.env.OPENAI_API_KEY ?? 'missing') +
          '/' +
          (process.env.GITHUB_TOKEN ?? 'missing'),
      },
    }
    process.stdout.write(JSON.stringify(response) + '\n')
    return
  }

  if (message.method === 'initialized') {
    process.stderr.write('fake app-server observed initialized\n')
  }
})
`
