import { mkdir, mkdtemp, readFile, realpath, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import type {
  CodexChatRuntime,
  InterruptTurnInput,
  ReleaseThreadInput,
  StartTurnInput,
} from './contract.js'
import { verifyProductionBundle } from './production-bundle.js'
import {
  startVerifiedCodexChatRuntime,
  type SpawnedCodexChatRuntime,
} from './runtime.js'

const PACKAGE_ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
)
const FAKE_APP_SERVER = path.join(
  PACKAGE_ROOT,
  'scripts',
  'fake_python_bridge_app_server.py',
)

export type CodexChatTestProcessTree = {
  readonly workerPid: number
  readonly nativePid: number
  readonly processGroupId: number
}

export interface CodexChatProcessTreeTestFixture {
  readonly runtime: CodexChatRuntime
  readProcessTree(): Promise<CodexChatTestProcessTree>
  waitForCloseRequest(): Promise<void>
  releaseClose(): Promise<void>
  dispose(): Promise<void>
}

export async function startCodexChatProcessTreeTestFixture(options: {
  readonly runtimeRoot: string
}): Promise<CodexChatProcessTreeTestFixture> {
  const bundle = await verifyProductionBundle(options.runtimeRoot)
  const fixtureRoot = await mkdtemp(
    path.join(tmpdir(), 'ay-ple-codex-chat-process-tree-'),
  )
  let spawned: SpawnedCodexChatRuntime | undefined
  try {
    const workspace = path.join(fixtureRoot, 'workspace')
    const environment = {
      home: path.join(fixtureRoot, 'runtime-home'),
      codexHome: path.join(fixtureRoot, 'codex-home'),
      codexSqliteHome: path.join(fixtureRoot, 'codex-sqlite-home'),
      tempDirectory: path.join(fixtureRoot, 'runtime-temp'),
    }
    await Promise.all(
      [workspace, ...Object.values(environment)].map((directory) =>
        mkdir(directory, { recursive: true }),
      ),
    )
    const [canonicalWorkspace, home, codexHome, codexSqliteHome, tempDirectory] =
      await Promise.all([
        realpath(workspace),
        realpath(environment.home),
        realpath(environment.codexHome),
        realpath(environment.codexSqliteHome),
        realpath(environment.tempDirectory),
      ])
    const journalPath = path.join(fixtureRoot, 'journal.json')
    const nativeChildPidPath = path.join(fixtureRoot, 'native-child.pid')
    spawned = await startVerifiedCodexChatRuntime({
      bundle,
      workspace: canonicalWorkspace,
      environment: { home, codexHome, codexSqliteHome, tempDirectory },
      launchArgsOverride: [
        bundle.pythonExecutable,
        '-B',
        FAKE_APP_SERVER,
        journalPath,
        nativeChildPidPath,
      ],
      journalPath,
      nativeChildPidPath,
    })

    const processTree = await readProcessTree(spawned, nativeChildPidPath)
    const closeRequested = createDeferred()
    const closeReleased = createDeferred()
    let closePromise: Promise<void> | undefined
    const runtime: CodexChatRuntime = {
      terminal: spawned.runtime.terminal,
      startThread: () => spawned!.runtime.startThread(),
      startTurn: (input: StartTurnInput) => spawned!.runtime.startTurn(input),
      interrupt: (input: InterruptTurnInput) => spawned!.runtime.interrupt(input),
      releaseThread: (input: ReleaseThreadInput) =>
        spawned!.runtime.releaseThread(input),
      close: () => {
        closeRequested.resolve()
        closePromise ??= closeReleased.promise.then(() => spawned!.runtime.close())
        return closePromise
      },
    }
    let disposed = false
    return {
      runtime,
      readProcessTree: async () => processTree,
      waitForCloseRequest: () => closeRequested.promise,
      releaseClose: async () => closeReleased.resolve(),
      async dispose() {
        if (disposed) return
        disposed = true
        closeReleased.resolve()
        await runtime.close().catch(() => undefined)
        await spawned?.closed.catch(() => undefined)
        await ensureProcessTreeGone(processTree)
        await rm(fixtureRoot, { force: true, recursive: true })
      },
    }
  } catch (error) {
    await spawned?.runtime.close().catch(() => undefined)
    await spawned?.closed.catch(() => undefined)
    await rm(fixtureRoot, { force: true, recursive: true })
    throw error
  }
}

async function readProcessTree(
  spawned: SpawnedCodexChatRuntime,
  nativeChildPidPath: string,
): Promise<CodexChatTestProcessTree> {
  const workerPid = spawned.child.pid
  if (!Number.isSafeInteger(workerPid) || (workerPid ?? 0) <= 1) {
    throw new Error('Codex Chat test worker PID is invalid')
  }
  const nativePid = Number(await readFile(nativeChildPidPath, 'utf8'))
  if (!Number.isSafeInteger(nativePid) || nativePid <= 1) {
    throw new Error('Codex Chat test native PID is invalid')
  }
  return {
    workerPid: workerPid as number,
    nativePid,
    processGroupId: workerPid as number,
  }
}

async function ensureProcessTreeGone(
  processTree: CodexChatTestProcessTree,
): Promise<void> {
  if (processGroupExists(processTree.processGroupId)) {
    process.kill(-processTree.processGroupId, 'SIGKILL')
  }
  await Promise.all([
    waitForProcessExit(processTree.workerPid),
    waitForProcessExit(processTree.nativePid),
    waitForProcessGroupExit(processTree.processGroupId),
  ])
}

async function waitForProcessExit(pid: number): Promise<void> {
  const deadline = Date.now() + 3_000
  while (Date.now() < deadline) {
    if (!processExists(pid)) return
    await delay(10)
  }
  throw new Error(`Process ${pid} did not disappear`)
}

async function waitForProcessGroupExit(processGroupId: number): Promise<void> {
  const deadline = Date.now() + 3_000
  while (Date.now() < deadline) {
    if (!processGroupExists(processGroupId)) return
    await delay(10)
  }
  throw new Error(`Process group ${processGroupId} did not disappear`)
}

function processExists(pid: number): boolean {
  try {
    process.kill(pid, 0)
    return true
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ESRCH') return false
    throw error
  }
}

function processGroupExists(processGroupId: number): boolean {
  try {
    process.kill(-processGroupId, 0)
    return true
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ESRCH') return false
    throw error
  }
}

function createDeferred(): {
  readonly promise: Promise<void>
  resolve(): void
} {
  let resolve!: () => void
  const promise = new Promise<void>((settle) => {
    resolve = settle
  })
  return { promise, resolve }
}

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds))
}
