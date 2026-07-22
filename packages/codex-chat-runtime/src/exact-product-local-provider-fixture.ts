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

import { verifyProductionBundle } from './production-bundle.js'
import {
  controlledPythonEnvironment,
  delay,
  terminateDetachedProcessGroup,
  waitForJsonFile,
  waitForProcessGroupExit,
  withinDuration,
} from './local-provider-test-support.js'
import {
  startVerifiedCodexChatRuntime,
  type CodexChatRuntimeEnvironment,
  type SpawnedCodexChatRuntime,
} from './runtime.js'
import type { CodexProductCapableRuntime } from './runtime-contract.js'

const PACKAGE_ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
)
const DEFAULT_RUNTIME_ROOT = path.join(
  PACKAGE_ROOT,
  '.artifacts',
  'production-runtime-darwin-arm64',
)
const LOCAL_PROVIDER = path.join(
  PACKAGE_ROOT,
  'scripts',
  'official_local_provider.py',
)
const PROVIDER_WAIT_MS = 30_000
const CLEANUP_WAIT_MS = 5_000
const PROVIDER_EVIDENCE_KEYS = [
  'requestCount',
  'stages',
  'managedSkillObserved',
  'toolSurfaceObserved',
  'activeWorkspaceCwdObserved',
  'scratchWriteObserved',
  'selectedSourcesRead',
  'proposalCommittedOutputObserved',
  'revisionRequestedOutputObserved',
  'replacementProposalCommittedOutputObserved',
  'reviewAcceptedOutputObserved',
  'planResponseServed',
  'replacementPlanResponseServed',
  'terminalServed',
  'failureCode',
] as const

export interface ExactProductProviderEvidence {
  readonly requestCount: number
  readonly stages: readonly string[]
  readonly managedSkillObserved: boolean
  readonly toolSurfaceObserved: boolean
  readonly activeWorkspaceCwdObserved: boolean
  readonly scratchWriteObserved: boolean
  readonly selectedSourcesRead: boolean
  readonly proposalCommittedOutputObserved: boolean
  readonly revisionRequestedOutputObserved: boolean
  readonly replacementProposalCommittedOutputObserved: boolean
  readonly reviewAcceptedOutputObserved: boolean
  readonly planResponseServed: boolean
  readonly replacementPlanResponseServed: boolean
  readonly terminalServed: boolean
  readonly failureCode: string | null
}

export interface ExactProductLocalProviderFixture {
  readonly runtime: CodexProductCapableRuntime
  readonly runtimeWorkspace: string
  readonly processGroupId: number
  readonly closed: Promise<void>
  readonly providerJournalPath: string
  waitForProviderRequests(count: number): Promise<void>
  readProviderEvidence(): Promise<ExactProductProviderEvidence>
  dispose(): Promise<void>
}

export async function startExactProductLocalProviderFixture(options: {
  readonly activeWorkspace: string
  readonly managedAppDataRoot: string
  readonly runtimeRoot?: string
}): Promise<ExactProductLocalProviderFixture> {
  const [bundle, activeWorkspace, managedAppDataRoot] = await Promise.all([
    verifyProductionBundle(
      path.resolve(options.runtimeRoot ?? DEFAULT_RUNTIME_ROOT),
    ),
    realpath(options.activeWorkspace),
    realpath(options.managedAppDataRoot),
  ])
  const fixtureRoot = await mkdtemp(
    path.join(tmpdir(), 'ay-ple-exact-product-local-provider-'),
  )
  let provider: ProductLocalProvider | undefined
  let spawned: SpawnedCodexChatRuntime | undefined
  try {
    const roots = {
      home: path.join(fixtureRoot, 'runtime-home'),
      codexHome: path.join(fixtureRoot, 'runtime-codex-home'),
      codexSqliteHome: path.join(fixtureRoot, 'runtime-codex-sqlite-home'),
      tempDirectory: path.join(fixtureRoot, 'runtime-temp'),
      provider: path.join(fixtureRoot, 'provider'),
    }
    await Promise.all(
      Object.values(roots).map((directory) =>
        mkdir(directory, { recursive: true }),
      ),
    )
    const [
      home,
      codexHome,
      codexSqliteHome,
      tempDirectory,
      providerRoot,
    ] = await Promise.all(
      Object.values(roots).map((directory) => realpath(directory)),
    )
    assertDisjointRoots(activeWorkspace, [
      managedAppDataRoot,
      home,
      codexHome,
      codexSqliteHome,
      tempDirectory,
      providerRoot,
    ])

    provider = await startProductLocalProvider({
      activeWorkspace,
      managedAppDataRoot,
      bundle,
      providerRoot,
    })
    await writeLocalProviderConfig(codexHome, provider.url)
    const environment: CodexChatRuntimeEnvironment = {
      home,
      codexHome,
      codexSqliteHome,
      tempDirectory,
    }
    spawned = await startVerifiedCodexChatRuntime({
      bundle,
      workspace: activeWorkspace,
      environment,
      disableManagedConfigForTest: true,
      deadlines: {
        responseMs: 10_000,
        streamIdleMs: 30_000,
        streamTotalMs: 60_000,
        gracefulCloseMs: 2_000,
        terminateMs: 2_000,
        postKillMs: 2_000,
      },
    })
    const processGroupId = requirePid(spawned.child, 'runtime')
    const activeProvider = provider
    const activeRuntime = spawned
    let disposePromise: Promise<void> | undefined
    return {
      runtime: activeRuntime.runtime,
      runtimeWorkspace: activeWorkspace,
      processGroupId,
      closed: activeRuntime.closed,
      providerJournalPath: activeProvider.journalPath,
      waitForProviderRequests: (count) =>
        waitForProviderRequestCount(activeProvider, count),
      readProviderEvidence: () =>
        readProviderEvidence(activeProvider.journalPath),
      dispose: () => {
        disposePromise ??= disposeFixture({
          fixtureRoot,
          provider: activeProvider,
          runtime: activeRuntime,
          runtimeProcessGroupId: processGroupId,
        })
        return disposePromise
      },
    }
  } catch (error) {
    await spawned?.runtime.close().catch(() => undefined)
    await spawned?.closed.catch(() => undefined)
    await provider?.close().catch(() => undefined)
    await rm(fixtureRoot, { force: true, recursive: true })
    throw error
  }
}

type VerifiedBundle = Awaited<ReturnType<typeof verifyProductionBundle>>

interface ProductLocalProvider {
  readonly child: ChildProcessWithoutNullStreams
  readonly journalPath: string
  readonly processGroupId: number
  readonly url: string
  close(): Promise<ExactProductProviderEvidence>
}

async function startProductLocalProvider(options: {
  readonly activeWorkspace: string
  readonly bundle: VerifiedBundle
  readonly managedAppDataRoot: string
  readonly providerRoot: string
}): Promise<ProductLocalProvider> {
  const readyPath = path.join(options.providerRoot, 'ready.json')
  const journalPath = path.join(options.providerRoot, 'journal.json')
  const child = spawn(
    options.bundle.pythonExecutable,
    [
      '-B',
      LOCAL_PROVIDER,
      'serve-product',
      '--ready-file',
      readyPath,
      '--journal-file',
      journalPath,
      '--active-workspace',
      options.activeWorkspace,
      '--app-data-root',
      options.managedAppDataRoot,
    ],
    {
      cwd: options.providerRoot,
      detached: true,
      env: controlledPythonEnvironment(options.bundle, options.providerRoot),
      stdio: ['pipe', 'pipe', 'pipe'],
    },
  )
  const processGroupId = requirePid(child, 'local provider')
  child.stderr.resume()
  let ready: { readonly url: string }
  try {
    ready = await waitForJsonFile<{ readonly url: string }>({
      child,
      exitedMessage:
        'Exact product local provider exited before publishing readiness',
      filePath: readyPath,
      retryReadError: isMissingFileError,
      timeoutMessage: 'Timed out waiting for exact product provider readiness',
      timeoutMs: 10_000,
    })
    if (typeof ready.url !== 'string' || ready.url.length === 0) {
      throw new Error('Exact product local provider published an invalid URL')
    }
  } catch (error) {
    await terminateDetachedProcessGroup({
      child,
      processGroupId,
    }).catch(() => undefined)
    throw error
  }
  let closePromise: Promise<ExactProductProviderEvidence> | undefined
  return {
    child,
    journalPath,
    processGroupId,
    url: ready.url,
    close: () => {
      closePromise ??= (async () => {
        if (child.exitCode === null && child.signalCode === null) {
          child.stdin.end('close\n')
        }
        await waitForChildExit(child, processGroupId)
        return readProviderEvidence(journalPath)
      })()
      return closePromise
    },
  }
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
      'name = "Official SDK product local provider"',
      `base_url = "${providerUrl}/v1"`,
      'wire_api = "responses"',
      'request_max_retries = 0',
      'stream_max_retries = 0',
      '',
    ].join('\n'),
    'utf8',
  )
}

async function waitForProviderRequestCount(
  provider: ProductLocalProvider,
  count: number,
): Promise<void> {
  if (!Number.isSafeInteger(count) || count < 0) {
    throw new Error('Provider request count must be a non-negative integer')
  }
  if (count === 0) return
  const deadline = Date.now() + PROVIDER_WAIT_MS
  while (Date.now() < deadline) {
    if (provider.child.exitCode !== null || provider.child.signalCode !== null) {
      throw new Error('Exact product local provider exited before the request')
    }
    try {
      const evidence = await readProviderEvidence(provider.journalPath)
      if (evidence.failureCode !== null) {
        throw new Error(
          `Exact product local provider failed: ${evidence.failureCode}`,
        )
      }
      if (evidence.requestCount >= count) return
    } catch (error) {
      if (!isMissingFileError(error)) throw error
    }
    await delay(10)
  }
  throw new Error(`Timed out waiting for provider request ${count}`)
}

async function readProviderEvidence(
  journalPath: string,
): Promise<ExactProductProviderEvidence> {
  const parsed = JSON.parse(await readFile(journalPath, 'utf8')) as unknown
  if (!isRecord(parsed)) {
    throw new Error('Exact product provider evidence must be an object')
  }
  const keys = Object.keys(parsed).sort()
  const expectedKeys = [...PROVIDER_EVIDENCE_KEYS].sort()
  if (
    keys.length !== expectedKeys.length ||
    keys.some((key, index) => key !== expectedKeys[index])
  ) {
    throw new Error('Exact product provider evidence fields are invalid')
  }
  const evidence: ExactProductProviderEvidence = {
    requestCount: requireNonNegativeInteger(parsed, 'requestCount'),
    stages: requireStringArray(parsed, 'stages'),
    managedSkillObserved: requireBoolean(parsed, 'managedSkillObserved'),
    toolSurfaceObserved: requireBoolean(parsed, 'toolSurfaceObserved'),
    activeWorkspaceCwdObserved: requireBoolean(
      parsed,
      'activeWorkspaceCwdObserved',
    ),
    scratchWriteObserved: requireBoolean(parsed, 'scratchWriteObserved'),
    selectedSourcesRead: requireBoolean(parsed, 'selectedSourcesRead'),
    proposalCommittedOutputObserved: requireBoolean(
      parsed,
      'proposalCommittedOutputObserved',
    ),
    revisionRequestedOutputObserved: requireBoolean(
      parsed,
      'revisionRequestedOutputObserved',
    ),
    replacementProposalCommittedOutputObserved: requireBoolean(
      parsed,
      'replacementProposalCommittedOutputObserved',
    ),
    reviewAcceptedOutputObserved: requireBoolean(
      parsed,
      'reviewAcceptedOutputObserved',
    ),
    planResponseServed: requireBoolean(parsed, 'planResponseServed'),
    replacementPlanResponseServed: requireBoolean(
      parsed,
      'replacementPlanResponseServed',
    ),
    terminalServed: requireBoolean(parsed, 'terminalServed'),
    failureCode: requireNullableString(parsed, 'failureCode'),
  }
  return evidence
}

async function disposeFixture(options: {
  readonly fixtureRoot: string
  readonly provider: ProductLocalProvider
  readonly runtime: SpawnedCodexChatRuntime
  readonly runtimeProcessGroupId: number
}): Promise<void> {
  const errors: unknown[] = []
  try {
    await options.runtime.runtime.close()
    await options.runtime.closed
  } catch (error) {
    errors.push(error)
    await terminateDetachedProcessGroup({
      child: options.runtime.child,
      processGroupId: options.runtimeProcessGroupId,
    }).catch((cleanupError) => errors.push(cleanupError))
  }
  try {
    await options.provider.close()
  } catch (error) {
    errors.push(error)
    await terminateDetachedProcessGroup({
      child: options.provider.child,
      processGroupId: options.provider.processGroupId,
    }).catch((cleanupError) => errors.push(cleanupError))
  }
  await Promise.all([
    waitForProcessGroupExit(options.runtimeProcessGroupId).catch((error) =>
      errors.push(error),
    ),
    waitForProcessGroupExit(options.provider.processGroupId).catch((error) =>
      errors.push(error),
    ),
  ])
  await rm(options.fixtureRoot, { force: true, recursive: true }).catch((error) =>
    errors.push(error),
  )
  if (errors.length > 0) {
    throw new AggregateError(
      errors,
      'Exact product local-provider fixture cleanup failed',
    )
  }
}

async function waitForChildExit(
  child: ChildProcessWithoutNullStreams,
  processGroupId: number,
): Promise<void> {
  if (child.exitCode === null && child.signalCode === null) {
    let result: {
      readonly code: number | null
      readonly signal: NodeJS.Signals | null
    }
    try {
      result = await withinDuration(
        new Promise((resolvePromise, reject) => {
          child.once('error', reject)
          child.once('close', (code, signal) =>
            resolvePromise({ code, signal }),
          )
        }),
        CLEANUP_WAIT_MS,
        'Exact product local provider did not close',
      )
    } catch (error) {
      await terminateDetachedProcessGroup({ child, processGroupId })
      throw error
    }
    if (result.signal !== null || result.code !== 0) {
      throw new Error(
        `Exact product local provider exited unsuccessfully: code=${String(result.code)} signal=${String(result.signal)}`,
      )
    }
  } else if (child.signalCode !== null || child.exitCode !== 0) {
    throw new Error(
      `Exact product local provider exited unsuccessfully: code=${String(child.exitCode)} signal=${String(child.signalCode)}`,
    )
  }
  await waitForProcessGroupExit(processGroupId)
}

function assertDisjointRoots(activeWorkspace: string, roots: string[]): void {
  for (let index = 0; index < roots.length; index += 1) {
    const root = roots[index]
    if (root === undefined) continue
    if (pathsOverlap(activeWorkspace, root)) {
      throw new Error(
        'Active SemesterWorkspace overlaps an exact-runtime fixture root',
      )
    }
    for (let candidate = index + 1; candidate < roots.length; candidate += 1) {
      const other = roots[candidate]
      if (other !== undefined && pathsOverlap(root, other)) {
        throw new Error('Exact-runtime fixture roots must be disjoint')
      }
    }
  }
}

function pathsOverlap(left: string, right: string): boolean {
  return containsPath(left, right) || containsPath(right, left)
}

function containsPath(parent: string, candidate: string): boolean {
  const relative = path.relative(parent, candidate)
  return (
    relative === '' ||
    (!relative.startsWith(`..${path.sep}`) && relative !== '..' && !path.isAbsolute(relative))
  )
}

function requirePid(
  child: ChildProcessWithoutNullStreams,
  label: string,
): number {
  const pid = child.pid
  if (!Number.isSafeInteger(pid) || (pid ?? 0) <= 1) {
    throw new Error(`Exact product ${label} PID is invalid`)
  }
  return pid as number
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function requireNonNegativeInteger(
  value: Record<string, unknown>,
  key: string,
): number {
  const field = value[key]
  if (!Number.isSafeInteger(field) || (field as number) < 0) {
    throw new Error(`Exact product provider evidence ${key} is invalid`)
  }
  return field as number
}

function requireStringArray(
  value: Record<string, unknown>,
  key: string,
): readonly string[] {
  const field = value[key]
  if (!Array.isArray(field) || !field.every((item) => typeof item === 'string')) {
    throw new Error(`Exact product provider evidence ${key} is invalid`)
  }
  return field
}

function requireBoolean(
  value: Record<string, unknown>,
  key: string,
): boolean {
  const field = value[key]
  if (typeof field !== 'boolean') {
    throw new Error(`Exact product provider evidence ${key} is invalid`)
  }
  return field
}

function requireNullableString(
  value: Record<string, unknown>,
  key: string,
): string | null {
  const field = value[key]
  if (field !== null && typeof field !== 'string') {
    throw new Error(`Exact product provider evidence ${key} is invalid`)
  }
  return field
}

function isMissingFileError(error: unknown): boolean {
  return (error as NodeJS.ErrnoException).code === 'ENOENT'
}
