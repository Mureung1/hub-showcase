import assert from 'node:assert/strict'
import { execFile, spawn, type ChildProcess } from 'node:child_process'
import {
  access,
  cp,
  lstat,
  mkdir,
  mkdtemp,
  realpath,
  rm,
  stat,
} from 'node:fs/promises'
import { createServer } from 'node:net'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'

import {
  decodeProductBootstrap,
  type ProductBootstrap,
} from '@ay-ple/product-contract'
import { chromium, errors } from 'playwright'

const execFileAsync = promisify(execFile)
const repositoryRoot = fileURLToPath(new URL('../', import.meta.url))
const serverEnvPath = path.join(repositoryRoot, 'apps/server/.env')
const productionRuntimeRoot = path.join(
  repositoryRoot,
  'packages/codex-chat-runtime/.artifacts/production-runtime-darwin-arm64',
)
const semesterWorkspaceSeed = path.join(
  repositoryRoot,
  'apps/chat-shell/e2e/fixtures/first-assignment-semester-workspace',
)
const expectedMaterials = [
  'lms-outline-notice.txt',
  'problem-solving-syllabus.txt',
  'unselected-control.txt',
]
const serverPort = 3000
const shellPort = 4173
const readinessTimeoutMs = 60_000
const shutdownTimeoutMs = 10_000
const courseName = '문제해결글쓰기'

type ProcessRecord = {
  readonly command: string
  readonly parentPid: number
  readonly pid: number
}

type ProductRoots = {
  readonly appDataRoot: string
  readonly poisonRoot: string
  readonly runRoot: string
  readonly workspaceRoot: string
}

class BlockedError extends Error {}

async function main(): Promise<void> {
  if (process.platform !== 'darwin' || process.arch !== 'arm64') {
    throw new BlockedError('test:product-entrypoint requires Darwin arm64')
  }

  await requirePath(productionRuntimeRoot, 'production runtime bundle')
  await requirePath(semesterWorkspaceSeed, 'canonical SemesterWorkspace seed')
  await requirePath(chromium.executablePath(), 'Playwright Chromium')
  await requireAbsent(serverEnvPath, 'apps/server/.env')
  await assertPortsAvailable([serverPort, shellPort])

  const roots = await prepareProductRoots()
  try {
    await runCanonicalProductCase(roots)
  } finally {
    await rm(roots.runRoot, { force: true, recursive: true })
  }

  console.log('canonical product Server + Chat Shell entrypoint: green')
}

async function prepareProductRoots(): Promise<ProductRoots> {
  const runRoot = await realpath(
    await mkdtemp(path.join(tmpdir(), 'ay-ple-product-entrypoint-')),
  )
  const appDataRoot = path.join(runRoot, 'app-data')
  const workspaceRoot = path.join(runRoot, 'semester-workspace')
  await mkdir(appDataRoot)
  await cp(semesterWorkspaceSeed, workspaceRoot, {
    errorOnExist: true,
    force: false,
    recursive: true,
  })
  return {
    runRoot,
    appDataRoot: await realpath(appDataRoot),
    workspaceRoot: await realpath(workspaceRoot),
    poisonRoot: path.join(runRoot, 'legacy-path-poison'),
  }
}

async function runCanonicalProductCase(roots: ProductRoots): Promise<void> {
  const child = spawn(
    'npm',
    ['run', 'dev', '--', '--app-data-root', roots.appDataRoot],
    {
      cwd: repositoryRoot,
      detached: true,
      env: controlledEnvironment({
        CODEX_CHAT_WORKSPACE: roots.workspaceRoot,
        CODEX_CHAT_RUNTIME_ROOT: path.join(roots.poisonRoot, 'runtime-root'),
        CODEX_CHAT_RUNTIME_HOME: path.join(roots.poisonRoot, 'runtime-home'),
        CODEX_CHAT_CODEX_HOME: path.join(roots.poisonRoot, 'codex-home'),
        CODEX_CHAT_SQLITE_HOME: path.join(roots.poisonRoot, 'sqlite-home'),
        CODEX_CHAT_TEMP_DIR: path.join(roots.poisonRoot, 'temp'),
      }),
      stdio: ['ignore', 'pipe', 'pipe'],
    },
  )
  await verifyDetachedProcess({
    child,
    label: 'canonical product',
    ports: [serverPort, shellPort],
    verify: async (output) => {
      const initial = await pollProductBootstrap(child, readinessTimeoutMs)
      const initialWorkspace = requireReadyWorkspace(initial)
      assert.equal(
        initial.accountReadiness.state,
        'not_ready',
        'verified product Runtime must report fresh app-managed account state',
      )
      assert.equal(initial.operationStatus, 'idle')
      assert.equal(initialWorkspace.course, null)
      assert.equal(initialWorkspace.confirmedRevision, 0)
      assert.deepEqual(
        initialWorkspace.materials
          .map(({ relativePath }) => relativePath)
          .sort(),
        expectedMaterials,
      )

      await assertLegacyRoutesAbsent()
      await verifyProductBrowser()

      const afterCourseCreation = await pollForCourse(child, courseName)
      const readyWorkspace = requireReadyWorkspace(afterCourseCreation)
      assert.equal(readyWorkspace.course?.displayName, courseName)
      assert.deepEqual(
        readyWorkspace.materials
          .map(({ relativePath }) => relativePath)
          .sort(),
        expectedMaterials,
      )

      await assertManagedRuntimeRoots(roots.appDataRoot)
      await requireAbsent(
        roots.poisonRoot,
        'legacy CODEX_CHAT_* path poison root',
      )
      await assertProductOwnershipOutput(output, roots)
      await assertCanonicalProcessGraph(child.pid, roots.appDataRoot)
    },
  })
}

async function verifyProductBrowser(): Promise<void> {
  const browser = await chromium.launch({ headless: true })
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
    await page.goto(`http://127.0.0.1:${shellPort}`, {
      waitUntil: 'domcontentloaded',
      timeout: readinessTimeoutMs,
    })

    const materials = page.getByRole('complementary', { name: '학기 자료' })
    await materials.waitFor({ timeout: readinessTimeoutMs })
    for (const relativePath of expectedMaterials) {
      await materials
        .getByText(relativePath, { exact: true })
        .waitFor({ timeout: readinessTimeoutMs })
    }
    await page
      .getByRole('complementary', { name: 'AY Chat' })
      .waitFor({ timeout: readinessTimeoutMs })
    await materials
      .getByRole('button', { name: /선택한 자료 정리하기/u })
      .waitFor({ timeout: readinessTimeoutMs })
    assert.equal(
      await page.locator('[data-runtime-status]').count(),
      0,
      'product Browser must not restore the legacy Runtime-status owner',
    )

    await materials.getByLabel('과목 이름').fill(courseName)
    await materials.getByRole('button', { name: '만들기' }).click()
    await page
      .locator('section[aria-label="현재 과목"]')
      .getByText(courseName, { exact: true })
      .waitFor({ timeout: readinessTimeoutMs })
  } finally {
    await browser.close()
  }
}

async function assertLegacyRoutesAbsent(): Promise<void> {
  const requests = [
    { method: 'GET', path: '/api/codex-chat/status' },
    { method: 'POST', path: '/api/codex-chat/threads' },
    { method: 'POST', path: '/api/codex-chat/threads/thread-1/turns' },
    {
      method: 'POST',
      path: '/api/codex-chat/threads/thread-1/turns/turn-1/interrupt',
    },
    { method: 'GET', path: '/api/codex-chat/anything' },
  ] as const

  for (const request of requests) {
    const response = await fetch(
      `http://127.0.0.1:${serverPort}${request.path}`,
      request.method === 'POST'
        ? {
            method: request.method,
            headers: { 'content-type': 'application/json' },
            body: '{}',
          }
        : { method: request.method },
    )
    assert.equal(
      response.status,
      404,
      `${request.method} ${request.path} must not remain as a public route`,
    )
  }
}

async function pollProductBootstrap(
  child: ChildProcess,
  timeoutMs: number,
): Promise<ProductBootstrap> {
  return decodeProductBootstrap(
    await pollJson(
      `http://127.0.0.1:${shellPort}/api/product/bootstrap`,
      child,
      timeoutMs,
    ),
  )
}

async function pollForCourse(
  child: ChildProcess,
  expectedCourseName: string,
): Promise<ProductBootstrap> {
  const deadline = Date.now() + readinessTimeoutMs
  while (Date.now() < deadline) {
    const bootstrap = await pollProductBootstrap(child, readinessTimeoutMs)
    if (
      bootstrap.workspace?.state === 'ready' &&
      bootstrap.workspace.course?.displayName === expectedCourseName
    ) {
      return bootstrap
    }
    await delay(100)
  }
  throw new BlockedError('product course creation did not settle')
}

function requireReadyWorkspace(
  bootstrap: ProductBootstrap,
): Extract<NonNullable<ProductBootstrap['workspace']>, { state: 'ready' }> {
  assert.equal(bootstrap.workspace?.state, 'ready')
  if (bootstrap.workspace?.state !== 'ready') {
    throw new Error('canonical product workspace must be ready')
  }
  return bootstrap.workspace
}

async function assertManagedRuntimeRoots(appDataRoot: string): Promise<void> {
  for (const relativePath of [
    'runtime/home',
    'runtime/codex-home',
    'runtime/codex-sqlite-home',
    'runtime/temp',
  ]) {
    await requireDirectory(
      path.join(appDataRoot, relativePath),
      `app-managed ${relativePath}`,
    )
  }
}

async function assertProductOwnershipOutput(
  output: { readonly stderr: string; readonly stdout: string },
  roots: ProductRoots,
): Promise<void> {
  const expectedWorkspace = `SemesterWorkspace: ${roots.workspaceRoot} (caller-owned)`
  const expectedAppData = `Product app data: ${roots.appDataRoot}`
  const ready = await waitFor(
    async () =>
      output.stdout.includes(expectedWorkspace) &&
      output.stdout.includes(expectedAppData),
    shutdownTimeoutMs,
  )
  assert.equal(
    ready,
    true,
    'canonical product caller must report its selected roots',
  )
}

function controlledEnvironment(
  overrides: NodeJS.ProcessEnv = {},
): NodeJS.ProcessEnv {
  const environment = { ...process.env }
  const removedPrefixes = [
    'AY_PLE_',
    'CODEX_CHAT_',
    'RUNTIME_HISTORY_',
    'RUNTIME_FAKE_',
  ]
  const removedKeys = [
    'CODEX_BIN_PATH',
    'CODEX_HOME',
    'CODEX_RUNTIME_CWD',
    'CODEX_SQLITE_HOME',
    'PORT',
  ]

  for (const key of Object.keys(environment)) {
    if (
      removedKeys.includes(key) ||
      removedPrefixes.some((prefix) => key.startsWith(prefix))
    ) {
      delete environment[key]
    }
  }

  return {
    ...environment,
    BROWSER: 'none',
    NO_COLOR: '1',
    ...overrides,
  }
}

async function assertCanonicalProcessGraph(
  rootPid: number | undefined,
  appDataRoot: string,
): Promise<void> {
  assert.ok(rootPid, 'npm run dev must expose a process id')
  const ready = await waitFor(async () => {
    const processes = await readProcessTree(rootPid)
    return (
      processes.some(({ command }) => isProductBootstrap(command)) &&
      processes.filter(({ command }) => isVite(command)).length === 1 &&
      processes.filter(({ command }) => isServerWatcher(command)).length ===
        1 &&
      processes.filter(({ command }) => isProductionPythonBridge(command))
        .length === 1 &&
      processes.filter(({ command }) => isProductionNativeRuntime(command))
        .length === 1
    )
  }, shutdownTimeoutMs)
  assert.equal(ready, true, 'canonical product process roles did not settle')

  const processes = await readProcessTree(rootPid)
  const root = requireProcess(processes, rootPid)
  const rootCommand = normalizeCommand(root.command)
  assert.equal(
    rootCommand.startsWith('npm run dev'),
    true,
    `unexpected canonical root command: ${root.command}`,
  )
  assert.equal(rootCommand.includes('--app-data-root'), true)
  assert.equal(rootCommand.includes(appDataRoot), true)

  const productBootstrap = requireDeepestProcess(
    processes,
    ({ command }) => isProductBootstrap(command),
    'product development bootstrap',
  )
  requireSingleProcess(
    processes,
    ({ command }) => isServerWatcher(command),
    'Server watcher',
  )
  requireSingleProcess(processes, ({ command }) => isVite(command), 'Vite')

  const serverListener = await requireSingleListener(processes, serverPort)
  const viteListener = await requireSingleListener(processes, shellPort)
  const pythonBridge = requireSingleProcess(
    processes,
    ({ command }) => isProductionPythonBridge(command),
    'production Python bridge',
  )
  const nativeRuntime = requireSingleProcess(
    processes,
    ({ command }) => isProductionNativeRuntime(command),
    'native Codex app-server',
  )
  assert.equal(
    isServerProcess(serverListener.command),
    true,
    `unexpected Server listener owner: ${serverListener.command}`,
  )
  assert.equal(
    isVite(viteListener.command),
    true,
    `unexpected Vite listener owner: ${viteListener.command}`,
  )
  assert.equal(
    isDescendantOf(processes, serverListener.pid, productBootstrap.pid),
    true,
    'Server must be supervised by the product bootstrap',
  )
  assert.equal(
    isDescendantOf(processes, viteListener.pid, productBootstrap.pid),
    true,
    'Vite must be supervised by the product bootstrap',
  )
  assert.equal(
    isDescendantOf(processes, pythonBridge.pid, serverListener.pid),
    true,
    'production Python bridge must be supervised by the product Server',
  )
  assert.equal(
    isDescendantOf(processes, nativeRuntime.pid, pythonBridge.pid),
    true,
    'native Codex app-server must be supervised by the production Python bridge',
  )

  const banned = [
    'dev:chat-only',
    '@ay-ple/inspector',
    'apps/inspector',
    '@ay-ple/runtime-core',
    '@ay-ple/runtime-fake',
    '@ay-ple/runtime-codex',
    'dev:chat-shell',
  ]
  for (const { command } of processes) {
    assert.equal(
      banned.some((value) => command.includes(value)),
      false,
      `unexpected legacy process: ${command}`,
    )
  }
}

function isProductBootstrap(command: string): boolean {
  return command.includes('scripts/product-development-bootstrap.mts')
}

function isServerWatcher(command: string): boolean {
  return command.includes('watch src/server.ts')
}

function isServerProcess(command: string): boolean {
  return command.includes('src/server.ts') && !command.includes('watch src/server.ts')
}

function isVite(command: string): boolean {
  return (
    command.includes('node_modules/.bin/vite') ||
    command.includes('vite/bin/vite.js')
  )
}

function isProductionPythonBridge(command: string): boolean {
  return (
    command.includes(productionRuntimeRoot) &&
    command.includes('/bundle/bridge/worker.py')
  )
}

function isProductionNativeRuntime(command: string): boolean {
  return (
    command.includes(productionRuntimeRoot) &&
    command.includes('/codex_cli_bin/bin/codex app-server')
  )
}

function requireSingleProcess(
  processes: readonly ProcessRecord[],
  predicate: (processRecord: ProcessRecord) => boolean,
  role: string,
): ProcessRecord {
  const matches = processes.filter(predicate)
  assert.equal(matches.length, 1, `canonical product dev must own one ${role}`)
  return matches[0] as ProcessRecord
}

function requireDeepestProcess(
  processes: readonly ProcessRecord[],
  predicate: (processRecord: ProcessRecord) => boolean,
  role: string,
): ProcessRecord {
  const matches = processes.filter(predicate)
  assert.equal(matches.length > 0, true, `canonical product dev must own ${role}`)
  const deepest = matches.filter((candidate) =>
    matches.every(
      (other) =>
        candidate.pid === other.pid ||
        isDescendantOf(processes, candidate.pid, other.pid),
    ),
  )
  assert.equal(deepest.length, 1, `${role} must have one supervised graph`)
  return deepest[0] as ProcessRecord
}

function requireProcess(
  processes: readonly ProcessRecord[],
  pid: number,
): ProcessRecord {
  const processRecord = processes.find((candidate) => candidate.pid === pid)
  assert.ok(processRecord, `missing process ${pid}`)
  return processRecord
}

function isDescendantOf(
  processes: readonly ProcessRecord[],
  pid: number,
  ancestorPid: number,
): boolean {
  let current = processes.find((candidate) => candidate.pid === pid)
  const visited = new Set<number>()
  while (current && !visited.has(current.pid)) {
    if (current.parentPid === ancestorPid) return true
    visited.add(current.pid)
    current = processes.find(
      (candidate) => candidate.pid === current?.parentPid,
    )
  }
  return false
}

async function requireSingleListener(
  processes: readonly ProcessRecord[],
  port: number,
): Promise<ProcessRecord> {
  const owners: ProcessRecord[] = []
  for (const processRecord of processes) {
    const endpoints = await readLoopbackListeners(processRecord.pid, port)
    if (endpoints.length === 0) continue
    assert.deepEqual(
      endpoints,
      [`127.0.0.1:${port}`],
      `port ${port} must listen only on the IPv4 loopback address`,
    )
    owners.push(processRecord)
  }
  assert.equal(owners.length, 1, `port ${port} must have one listener owner`)
  return owners[0] as ProcessRecord
}

async function readLoopbackListeners(
  pid: number,
  port: number,
): Promise<string[]> {
  let stdout: string
  try {
    const result = await execFileAsync('/usr/sbin/lsof', [
      '-nP',
      '-a',
      '-p',
      String(pid),
      `-iTCP:${port}`,
      '-sTCP:LISTEN',
      '-Fn',
    ])
    stdout = result.stdout
  } catch (error) {
    if (hasExitCode(error, 1)) return []
    throw error
  }
  return stdout
    .split('\n')
    .filter((line) => line.startsWith('n'))
    .map((line) => line.slice(1))
}

async function readProcessTree(rootPid: number): Promise<ProcessRecord[]> {
  const { stdout } = await execFileAsync('/bin/ps', [
    '-axo',
    'pid=,ppid=,command=',
  ])
  const allProcesses = stdout
    .split('\n')
    .map((line) => line.match(/^\s*(\d+)\s+(\d+)\s+(.+)$/))
    .filter((match): match is RegExpMatchArray => match !== null)
    .map((match) => ({
      pid: Number(match[1]),
      parentPid: Number(match[2]),
      command: match[3] ?? '',
    }))
  const included = new Set([rootPid])
  let changed = true

  while (changed) {
    changed = false
    for (const processRecord of allProcesses) {
      if (
        included.has(processRecord.parentPid) &&
        !included.has(processRecord.pid)
      ) {
        included.add(processRecord.pid)
        changed = true
      }
    }
  }

  return allProcesses.filter(({ pid }) => included.has(pid))
}

async function pollJson(
  url: string,
  child: ChildProcess,
  timeoutMs: number,
): Promise<unknown> {
  const deadline = Date.now() + timeoutMs

  while (Date.now() < deadline) {
    if (child.exitCode !== null || child.signalCode !== null) {
      throw new Error(`entrypoint exited before readiness: ${url}`)
    }
    try {
      const response = await fetch(url)
      if (response.ok) return response.json()
    } catch {
      // Readiness polling intentionally ignores connection refusal.
    }
    await delay(200)
  }

  throw new BlockedError(`entrypoint readiness timed out: ${url}`)
}

async function verifyDetachedProcess({
  child,
  label,
  ports,
  verify,
}: {
  readonly child: ChildProcess
  readonly label: string
  readonly ports: readonly number[]
  readonly verify: (
    output: { readonly stderr: string; readonly stdout: string },
  ) => Promise<void>
}): Promise<void> {
  const output = captureOutput(child)
  let testError: unknown

  try {
    await verify(output)
  } catch (error) {
    testError = addChildOutput(error, label, output)
  }

  try {
    await stopProcessGroup(child, ports)
  } catch (error) {
    testError ??= addChildOutput(error, label, output)
  }

  if (testError) throw testError
}

async function stopProcessGroup(
  child: ChildProcess,
  ports: readonly number[],
): Promise<void> {
  const pid = child.pid
  if (!pid) throw new Error('entrypoint child had no process id')
  const observedProcesses = await readProcessTree(pid)

  let forced = false
  if (await processGroupExists(pid)) {
    try {
      process.kill(-pid, 'SIGINT')
    } catch (error) {
      if (!isNoSuchProcess(error)) throw error
    }
  }

  const stopped = await waitFor(
    async () =>
      (await processGroupGone(pid)) && observedProcessesGone(observedProcesses),
    shutdownTimeoutMs,
  )
  if (!stopped) {
    forced = true
    await forceStopObservedProcesses(pid, observedProcesses)
    await waitFor(
      async () =>
        (await processGroupGone(pid)) &&
        observedProcessesGone(observedProcesses),
      2_000,
    )
  }

  if (!(await waitFor(() => portsAvailable(ports), shutdownTimeoutMs))) {
    throw new Error(`entrypoint did not release ports: ${ports.join(', ')}`)
  }
  if (forced) {
    throw new Error('entrypoint required SIGKILL after the shutdown deadline')
  }
}

async function forceStopObservedProcesses(
  processGroupId: number,
  processes: readonly ProcessRecord[],
): Promise<void> {
  try {
    process.kill(-processGroupId, 'SIGKILL')
  } catch (error) {
    if (!isNoSuchProcess(error)) throw error
  }
  for (const { pid } of [...processes].reverse()) {
    if (pid <= 1) continue
    try {
      process.kill(pid, 'SIGKILL')
    } catch (error) {
      if (!isNoSuchProcess(error)) throw error
    }
  }
}

function observedProcessesGone(processes: readonly ProcessRecord[]): boolean {
  return processes.every(({ pid }) => !processExists(pid))
}

function processExists(pid: number): boolean {
  try {
    process.kill(pid, 0)
    return true
  } catch (error) {
    if (isNoSuchProcess(error)) return false
    throw error
  }
}

async function processGroupExists(processGroupId: number): Promise<boolean> {
  return !(await processGroupGone(processGroupId))
}

async function processGroupGone(processGroupId: number): Promise<boolean> {
  const { stdout } = await execFileAsync('/bin/ps', ['-axo', 'pgid='])
  return !stdout
    .split('\n')
    .some((value) => Number(value.trim()) === processGroupId)
}

async function assertPortsAvailable(ports: readonly number[]): Promise<void> {
  for (const port of ports) await assertPortAvailable(port)
}

async function portsAvailable(ports: readonly number[]): Promise<boolean> {
  for (const port of ports) {
    if (!(await isPortAvailable(port))) return false
  }
  return true
}

async function assertPortAvailable(port: number): Promise<void> {
  if (!(await isPortAvailable(port))) {
    throw new BlockedError(`required port is occupied: ${port}`)
  }
}

async function isPortAvailable(port: number): Promise<boolean> {
  return new Promise<boolean>((resolve) => {
    const server = createServer()
    server.once('error', () => resolve(false))
    server.listen(port, '127.0.0.1', () => {
      server.close((error) => resolve(error === undefined))
    })
  })
}

async function requirePath(filePath: string, label: string): Promise<void> {
  try {
    await access(filePath)
  } catch {
    throw new BlockedError(`${label} is missing`)
  }
}

async function requireDirectory(
  directory: string,
  label: string,
): Promise<void> {
  const stats = await lstat(directory)
  assert.equal(stats.isDirectory(), true, `${label} must be a directory`)
  assert.equal(stats.isSymbolicLink(), false, `${label} must not be a symlink`)
  assert.equal(await realpath(directory), directory, `${label} must be canonical`)
}

async function requireAbsent(filePath: string, label: string): Promise<void> {
  try {
    await stat(filePath)
  } catch (error) {
    if (isNoSuchFile(error)) return
    throw error
  }
  throw new Error(`${label} must be absent for the controlled gate`)
}

async function waitFor(
  check: () => Promise<boolean>,
  timeoutMs: number,
): Promise<boolean> {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    if (await check()) return true
    await delay(100)
  }
  return check()
}

function captureOutput(child: ChildProcess): { stderr: string; stdout: string } {
  const result = { stderr: '', stdout: '' }
  const append = (key: 'stderr' | 'stdout', chunk: Buffer) => {
    result[key] = `${result[key]}${chunk.toString()}`.slice(-16_384)
  }
  child.stderr?.on('data', (chunk: Buffer) => append('stderr', chunk))
  child.stdout?.on('data', (chunk: Buffer) => append('stdout', chunk))
  return result
}

function addChildOutput(
  error: unknown,
  name: string,
  output: { readonly stderr: string; readonly stdout: string },
): Error {
  const message = error instanceof Error ? error.message : String(error)
  const detail = `${name}: ${message}\nstdout:\n${output.stdout}\nstderr:\n${output.stderr}`
  return isBlockedEntrypointError(error)
    ? new BlockedError(detail, { cause: error })
    : new Error(detail, { cause: error })
}

function isBlockedEntrypointError(error: unknown): boolean {
  return error instanceof BlockedError || error instanceof errors.TimeoutError
}

function normalizeCommand(command: string): string {
  return command.trim().replace(/\s+/g, ' ')
}

function hasExitCode(error: unknown, code: number): boolean {
  return (
    error instanceof Error &&
    'code' in error &&
    (error as { readonly code?: unknown }).code === code
  )
}

function isNoSuchFile(error: unknown): boolean {
  return hasErrnoCode(error, 'ENOENT')
}

function isNoSuchProcess(error: unknown): boolean {
  return hasErrnoCode(error, 'ESRCH')
}

function hasErrnoCode(error: unknown, code: string): boolean {
  return (
    error instanceof Error &&
    'code' in error &&
    (error as NodeJS.ErrnoException).code === code
  )
}

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds))
}

void main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error)
  console.error(message)
  process.exitCode = error instanceof BlockedError ? 2 : 1
})
