import {
  spawn,
  type ChildProcessWithoutNullStreams,
} from 'node:child_process'
import {
  mkdir,
  mkdtemp,
  readFile,
  realpath,
  rm,
  writeFile,
} from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import {
  controlledPythonEnvironment,
  terminateDetachedProcessGroup,
  waitForJsonFile,
  waitForProcessGroupExit,
  withinDuration,
} from './local-provider-test-support.js'
import { verifyProductionBundle } from './production-bundle.js'
import {
  startVerifiedCodexChatRuntime,
  type CodexChatRuntimeEnvironment,
  type SpawnedCodexChatRuntime,
} from './runtime.js'
import type {
  CodexChildEnvironment,
  CodexWorkspaceRuntime,
} from './runtime-contract.js'

const PACKAGE_ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
)
const LOCAL_PROVIDER = path.join(
  PACKAGE_ROOT,
  'scripts',
  'official_local_provider.py',
)

export type CodexActionLocalProviderFunctionCall = {
  readonly callId: string
  readonly name: string
  readonly arguments: Readonly<Record<string, unknown>>
}

export type CodexActionLocalProviderJournal = {
  readonly requests: ReadonlyArray<{
    readonly developerTexts: readonly string[]
    readonly functionCalls: readonly CodexActionLocalProviderFunctionCall[]
    readonly functionOutputs: readonly string[]
    readonly instructions: string | null
    readonly method: string
    readonly model: string | null
    readonly path: string
    readonly toolNames: readonly string[]
    readonly userTexts: readonly string[]
  }>
}

export interface CodexActionLocalProviderTestFixture {
  createRuntime(options: {
    readonly childEnvironment: CodexChildEnvironment
  }): Promise<CodexWorkspaceRuntime>
  finish(): Promise<CodexActionLocalProviderJournal>
  dispose(): Promise<void>
}

export async function startCodexActionLocalProviderTestFixture(options: {
  readonly runtimeRoot: string
  readonly workspace: string
}): Promise<CodexActionLocalProviderTestFixture> {
  const bundle = await verifyProductionBundle(options.runtimeRoot)
  const fixtureRoot = await realpath(
    await mkdtemp(path.join(tmpdir(), 'ay-ple-action-local-provider-')),
  )
  const environment = await createEnvironmentRoots(fixtureRoot)
  const provider = await startActionProvider(bundle, fixtureRoot)
  await writeLocalProviderConfig(environment.codexHome, provider.url)

  let spawned: SpawnedCodexChatRuntime | undefined
  let exposedRuntime: CodexWorkspaceRuntime | undefined
  let providerJournal: CodexActionLocalProviderJournal | undefined
  let disposed = false

  const closeRuntime = async (): Promise<void> => {
    if (!spawned) return
    await spawned.runtime.close()
    await withinDuration(
      spawned.closed,
      10_000,
      'Exact action Runtime did not close',
    )
    await waitForProcessGroupExit(requirePid(spawned.child), 10_000)
  }

  const closeProvider = async (): Promise<CodexActionLocalProviderJournal> => {
    providerJournal ??= await provider.close()
    return providerJournal
  }

  return {
    async createRuntime({ childEnvironment }) {
      if (spawned || exposedRuntime) {
        throw new Error('Exact action Runtime fixture may start only once')
      }
      spawned = await startVerifiedCodexChatRuntime({
        bundle,
        workspace: options.workspace,
        environment,
        childEnvironment,
        disableManagedConfigForTest: true,
        deadlines: {
          responseMs: 10_000,
          streamIdleMs: 30_000,
          streamTotalMs: 90_000,
          gracefulCloseMs: 2_000,
          terminateMs: 2_000,
          postKillMs: 2_000,
        },
      })
      let closePromise: Promise<void> | undefined
      const actual = spawned.runtime
      exposedRuntime = {
        terminal: actual.terminal,
        readAccountReadiness: async () => ({ state: 'ready' }),
        readModelCatalog: () => actual.readModelCatalog(),
        readEffectiveConfig: (input) => actual.readEffectiveConfig(input),
        listEffectiveSkills: (input) => actual.listEffectiveSkills(input),
        startThread: () => actual.startThread(),
        startTurn: (input) => actual.startTurn(input),
        startProductTurn: (input) => actual.startProductTurn(input),
        answerUserInput: (input) => actual.answerUserInput(input),
        cancelUserInput: (input) => actual.cancelUserInput(input),
        interrupt: (input) => actual.interrupt(input),
        releaseThread: (input) => actual.releaseThread(input),
        close: () => {
          closePromise ??= closeRuntime()
          return closePromise
        },
      }
      return exposedRuntime
    },
    async finish() {
      await exposedRuntime?.close()
      return closeProvider()
    },
    async dispose() {
      if (disposed) return
      disposed = true
      await exposedRuntime?.close().catch(() => undefined)
      await closeProvider().catch(() => undefined)
      await rm(fixtureRoot, { recursive: true, force: true })
    },
  }
}

type VerifiedBundle = Awaited<ReturnType<typeof verifyProductionBundle>>

type ActionProvider = {
  readonly url: string
  close(): Promise<CodexActionLocalProviderJournal>
}

async function startActionProvider(
  bundle: VerifiedBundle,
  root: string,
): Promise<ActionProvider> {
  const providerRoot = path.join(root, 'provider')
  await mkdir(providerRoot)
  const readyPath = path.join(providerRoot, 'ready.json')
  const journalPath = path.join(providerRoot, 'journal.json')
  const child = spawn(
    bundle.pythonExecutable,
    [
      '-B',
      LOCAL_PROVIDER,
      'serve-action',
      '--ready-file',
      readyPath,
      '--journal-file',
      journalPath,
    ],
    {
      cwd: providerRoot,
      detached: true,
      env: controlledPythonEnvironment(bundle, providerRoot),
      stdio: ['pipe', 'pipe', 'pipe'],
    },
  )
  const processGroupId = requirePid(child)
  let stderr = ''
  child.stderr.setEncoding('utf8')
  child.stderr.on('data', (chunk: string) => {
    stderr = `${stderr}${chunk}`.slice(-16_384)
  })
  let ready: { readonly url: string }
  try {
    ready = await waitForJsonFile<{ readonly url: string }>({
      child,
      exitedMessage: 'Action local provider exited before readiness',
      filePath: readyPath,
      retryReadError: () => true,
      timeoutMessage: 'Timed out waiting for action local provider',
      timeoutMs: 10_000,
    })
  } catch (error) {
    await terminateDetachedProcessGroup({
      child,
      childCloseTimeoutMessage: 'Action local provider did not close',
      processGroupId,
    }).catch(() => undefined)
    throw error
  }

  let closePromise: Promise<CodexActionLocalProviderJournal> | undefined
  return {
    url: ready.url,
    close() {
      closePromise ??= (async () => {
        if (child.exitCode === null && child.signalCode === null) {
          child.stdin.end('close\n')
        }
        const result = await waitForChild(child, stderr)
        await waitForProcessGroupExit(processGroupId, 10_000)
        if (result.code !== 0) {
          throw new Error(`Action local provider failed: ${result.stderr}`)
        }
        return JSON.parse(
          await readFile(journalPath, 'utf8'),
        ) as CodexActionLocalProviderJournal
      })()
      return closePromise
    },
  }
}

async function createEnvironmentRoots(
  root: string,
): Promise<CodexChatRuntimeEnvironment> {
  const candidates = {
    home: path.join(root, 'runtime-home'),
    codexHome: path.join(root, 'runtime-codex-home'),
    codexSqliteHome: path.join(root, 'runtime-codex-sqlite-home'),
    tempDirectory: path.join(root, 'runtime-temp'),
  }
  await Promise.all(
    Object.values(candidates).map((directory) =>
      mkdir(directory, { recursive: true }),
    ),
  )
  const [home, codexHome, codexSqliteHome, tempDirectory] = await Promise.all([
    realpath(candidates.home),
    realpath(candidates.codexHome),
    realpath(candidates.codexSqliteHome),
    realpath(candidates.tempDirectory),
  ])
  return { home, codexHome, codexSqliteHome, tempDirectory }
}

async function writeLocalProviderConfig(
  codexHome: string,
  providerUrl: string,
): Promise<void> {
  await writeFile(
    path.join(codexHome, 'config.toml'),
    [
      'model = "mock-model"',
      'approval_policy = "never"',
      'sandbox_mode = "read-only"',
      'model_provider = "mock_provider"',
      '',
      '[model_providers.mock_provider]',
      'name = "Official SDK action local provider"',
      `base_url = "${providerUrl}/v1"`,
      'wire_api = "responses"',
      'request_max_retries = 0',
      'stream_max_retries = 0',
      '',
    ].join('\n'),
    'utf8',
  )
}

async function waitForChild(
  child: ChildProcessWithoutNullStreams,
  stderr: string,
): Promise<{ readonly code: number | null; readonly stderr: string }> {
  const result = await withinDuration(
    new Promise<{
      readonly code: number | null
      readonly signal: NodeJS.Signals | null
    }>((resolve, reject) => {
      child.once('error', reject)
      child.once('close', (code, signal) => resolve({ code, signal }))
    }),
    10_000,
    'Action local provider did not exit',
  )
  if (result.signal !== null) {
    throw new Error(`Action local provider exited from ${result.signal}: ${stderr}`)
  }
  return { code: result.code, stderr }
}

function requirePid(child: ChildProcessWithoutNullStreams): number {
  const pid = child.pid
  if (!Number.isSafeInteger(pid) || (pid ?? 0) <= 1) {
    throw new Error('Action local provider process ID is invalid')
  }
  return pid as number
}
