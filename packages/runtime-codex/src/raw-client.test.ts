import assert from 'node:assert/strict'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import {
  CodexRawClient,
  runCodexInitializeSmoke,
  type CodexRawDebugLogEntry,
} from './index.js'

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
