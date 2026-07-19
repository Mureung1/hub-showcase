import assert from 'node:assert/strict'
import { execFile, spawn, type ChildProcess } from 'node:child_process'
import { access, mkdir, mkdtemp, rm, stat, writeFile } from 'node:fs/promises'
import { createServer } from 'node:net'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'

import type { CodexChatStatus } from '@ay-ple/codex-chat-runtime/contract'
import { chromium, errors } from 'playwright'

const execFileAsync = promisify(execFile)
const workspaceRoot = fileURLToPath(new URL('../', import.meta.url))
const serverEntryPath = path.join(workspaceRoot, 'apps/server/src/server.ts')
const serverEnvPath = path.join(workspaceRoot, 'apps/server/.env')
const productionRuntimeRoot = path.join(
  workspaceRoot,
  'packages/codex-chat-runtime/.artifacts/production-runtime-darwin-arm64',
)
const sourceCommit = '8c68d4c87dc54d38861f5114e920c3de2efa5876'
const runtimeVersion = '0.144.4'
const configuredStatus = {
  state: 'configured',
  approvalMode: 'deny_all',
  sandbox: 'read_only',
  sourceCommit,
  runtimeVersion,
} satisfies CodexChatStatus
const serverPort = 3000
const shellPort = 4173
const readinessTimeoutMs = 60_000
const shutdownTimeoutMs = 10_000

type ProcessRecord = {
  readonly command: string
  readonly parentPid: number
  readonly pid: number
}

class BlockedError extends Error {}

async function main(): Promise<void> {
  if (process.platform !== 'darwin' || process.arch !== 'arm64') {
    throw new BlockedError('test:dev-entrypoint requires Darwin arm64')
  }

  await requirePath(productionRuntimeRoot, 'production runtime bundle')
  await requirePath(chromium.executablePath(), 'Playwright Chromium')
  await requireAbsent(serverEnvPath, 'apps/server/.env')

  await runCanonicalCase({
    name: 'origin-only',
    environment: controlledEnvironment(),
    expectedStatus: {
      state: 'unavailable',
      approvalMode: 'deny_all',
      sandbox: 'read_only',
      reason: 'invalid_configuration',
    },
  })

  const configuredRoot = await prepareConfiguredRoots(
    'ay-ple-dev-entrypoint-configured-',
  )
  try {
    await runCanonicalCase({
      name: 'configured',
      environment: controlledEnvironment({
        CODEX_CHAT_RUNTIME_ROOT: productionRuntimeRoot,
        CODEX_CHAT_WORKSPACE: workspaceRoot,
        CODEX_CHAT_RUNTIME_HOME: configuredRoot.home,
        CODEX_CHAT_CODEX_HOME: configuredRoot.codexHome,
        CODEX_CHAT_SQLITE_HOME: configuredRoot.sqliteHome,
        CODEX_CHAT_TEMP_DIR: configuredRoot.tempDirectory,
      }),
      expectedStatus: configuredStatus,
    })
  } finally {
    await rm(configuredRoot.root, { force: true, recursive: true })
  }

  await verifyLocalEnvFallbackAndCallerPrecedence()
  console.log('canonical Server + Chat Shell entrypoint: green')
}

async function runCanonicalCase({
  name,
  environment,
  expectedStatus,
}: {
  readonly name: string
  readonly environment: NodeJS.ProcessEnv
  readonly expectedStatus: CodexChatStatus
}): Promise<void> {
  await assertPortsAvailable([serverPort, shellPort])
  const child = spawn('npm', ['run', 'dev'], {
    cwd: workspaceRoot,
    detached: true,
    env: environment,
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  await verifyDetachedProcess({
    child,
    label: name,
    ports: [serverPort, shellPort],
    verify: async () => {
      const status = await pollJson(
        `http://127.0.0.1:${serverPort}/api/codex-chat/status`,
        child,
        readinessTimeoutMs,
      )
      assert.deepEqual(status, expectedStatus)

      const browser = await chromium.launch({ headless: true })
      try {
        const page = await browser.newPage()
        await page.goto(`http://127.0.0.1:${shellPort}`, {
          waitUntil: 'domcontentloaded',
          timeout: readinessTimeoutMs,
        })
        await page
          .locator(`[data-runtime-status="${expectedStatus.state}"]`)
          .waitFor({ timeout: readinessTimeoutMs })
      } finally {
        await browser.close()
      }

      await assertCanonicalProcessGraph(child.pid)
    },
  })
}

async function verifyLocalEnvFallbackAndCallerPrecedence(): Promise<void> {
  const configuredRoot = await prepareConfiguredRoots(
    'ay-ple-server-dotenv-entrypoint-',
  )
  const callerPort = await reservePort()
  const envPort = await reservePort()
  const envFile = [
    `PORT=${envPort}`,
    `CODEX_CHAT_RUNTIME_ROOT=${productionRuntimeRoot}`,
    `CODEX_CHAT_WORKSPACE=${path.join(configuredRoot.root, 'missing-workspace')}`,
    `CODEX_CHAT_RUNTIME_HOME=${configuredRoot.home}`,
    `CODEX_CHAT_CODEX_HOME=${configuredRoot.codexHome}`,
    `CODEX_CHAT_SQLITE_HOME=${configuredRoot.sqliteHome}`,
    `CODEX_CHAT_TEMP_DIR=${configuredRoot.tempDirectory}`,
    '',
  ].join('\n')

  await writeFile(path.join(configuredRoot.root, '.env'), envFile, {
    encoding: 'utf8',
    flag: 'wx',
    mode: 0o600,
  })

  const tsxLoader = fileURLToPath(import.meta.resolve('tsx'))
  const child = spawn(
    process.execPath,
    [
      '--conditions=development',
      '--import',
      tsxLoader,
      serverEntryPath,
    ],
    {
      cwd: configuredRoot.root,
      detached: true,
      env: controlledEnvironment({
        PORT: String(callerPort),
        CODEX_CHAT_WORKSPACE: workspaceRoot,
      }),
      stdio: ['ignore', 'pipe', 'pipe'],
    },
  )
  try {
    await verifyDetachedProcess({
      child,
      label: 'local .env',
      ports: [callerPort],
      verify: async () => {
        const status = await pollJson(
          `http://127.0.0.1:${callerPort}/api/codex-chat/status`,
          child,
          readinessTimeoutMs,
        )
        assert.deepEqual(status, configuredStatus)
        await assertPortAvailable(envPort)
      },
    })
  } finally {
    await rm(configuredRoot.root, { force: true, recursive: true })
  }
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
  readonly verify: () => Promise<void>
}): Promise<void> {
  const output = captureOutput(child)
  let testError: unknown

  try {
    await verify()
  } catch (error) {
    testError = addChildOutput(error, label, output)
  }

  try {
    await stopProcessGroup(child, ports)
  } catch (error) {
    testError = error
  }

  if (testError) throw testError
}

function controlledEnvironment(
  overrides: NodeJS.ProcessEnv = {},
): NodeJS.ProcessEnv {
  const environment = { ...process.env }
  const removedPrefixes = [
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
): Promise<void> {
  assert.ok(rootPid, 'npm run dev must expose a process id')
  await waitFor(
    async () => (await readProcessTree(rootPid)).length === 7,
    shutdownTimeoutMs,
  )
  const processes = await readProcessTree(rootPid)
  const commands = processes.map(({ command }) => command)
  const banned = [
    '@ay-ple/inspector',
    'apps/inspector',
    '@ay-ple/runtime-core',
    '@ay-ple/runtime-fake',
    '@ay-ple/runtime-codex',
    'dev:chat-shell',
    'codex app-server',
    'bundle/bridge/worker.py',
  ]

  for (const command of commands) {
    assert.equal(
      banned.some((value) => command.includes(value)),
      false,
      `unexpected legacy or native child: ${command}`,
    )
  }

  assert.equal(processes.length, 7, 'canonical dev must own seven processes')
  const root = requireProcess(processes, rootPid)
  assert.equal(normalizeCommand(root.command), 'npm run dev')

  const concurrently = requireOnlyChild(processes, root.pid, 'root npm')
  assertExactNodeCommand(
    concurrently.command,
    [
      path.join(workspaceRoot, 'node_modules/.bin/concurrently'),
      '-n server,chat-shell',
      '-c blue,magenta',
      'CODEX_CHAT_ORIGIN=http://127.0.0.1:4173',
      'npm run dev -w @ay-ple/server',
      'npm run dev -w @ay-ple/chat-shell',
    ].join(' '),
    'concurrently',
  )

  const workspaceCommands = childrenOf(processes, concurrently.pid)
  assert.equal(
    workspaceCommands.length,
    2,
    'concurrently must own exactly two workspace npm processes',
  )
  for (const workspaceCommand of workspaceCommands) {
    assert.equal(normalizeCommand(workspaceCommand.command), 'npm run dev')
  }

  const workspaceLaunchers = workspaceCommands.map((workspaceCommand) =>
    requireOnlyChild(processes, workspaceCommand.pid, 'workspace npm'),
  )
  const viteArguments = [
    path.join(workspaceRoot, 'node_modules/.bin/vite'),
    '--host 127.0.0.1',
    '--port 4173',
    '--strictPort',
  ].join(' ')
  const tsxArguments = [
    path.join(workspaceRoot, 'node_modules/.bin/tsx'),
    'watch src/server.ts',
  ].join(' ')
  const vite = requireNodeRole(workspaceLaunchers, viteArguments, 'Vite')
  const tsx = requireNodeRole(workspaceLaunchers, tsxArguments, 'tsx')

  assert.equal(childrenOf(processes, vite.pid).length, 0, 'Vite must be a leaf')
  const server = requireOnlyChild(processes, tsx.pid, 'tsx')
  assertExactNodeCommand(
    server.command,
    [
      '--require',
      path.join(workspaceRoot, 'node_modules/tsx/dist/preflight.cjs'),
      '--import',
      `file://${path.join(workspaceRoot, 'node_modules/tsx/dist/loader.mjs')}`,
      'src/server.ts',
    ].join(' '),
    'Server',
  )
  assert.equal(
    childrenOf(processes, server.pid).length,
    0,
    'Server must not start a native child before a Chat request',
  )
  await assertExactLoopbackListener(server.pid, serverPort)
}

function childrenOf(
  processes: readonly ProcessRecord[],
  parentPid: number,
): ProcessRecord[] {
  return processes.filter(
    (processRecord) => processRecord.parentPid === parentPid,
  )
}

function requireProcess(
  processes: readonly ProcessRecord[],
  pid: number,
): ProcessRecord {
  const processRecord = processes.find((candidate) => candidate.pid === pid)
  assert.ok(processRecord, `missing process ${pid}`)
  return processRecord
}

function requireOnlyChild(
  processes: readonly ProcessRecord[],
  parentPid: number,
  role: string,
): ProcessRecord {
  const children = childrenOf(processes, parentPid)
  assert.equal(children.length, 1, `${role} must own exactly one child`)
  return children[0] as ProcessRecord
}

function requireNodeRole(
  candidates: readonly ProcessRecord[],
  expectedArguments: string,
  role: string,
): ProcessRecord {
  const matches = candidates.filter(({ command }) =>
    isExactNodeCommand(command, expectedArguments),
  )
  assert.equal(matches.length, 1, `canonical dev must start exactly one ${role}`)
  return matches[0] as ProcessRecord
}

function assertExactNodeCommand(
  command: string,
  expectedArguments: string,
  role: string,
): void {
  assert.equal(
    isExactNodeCommand(command, expectedArguments),
    true,
    `${role} argv mismatch: ${command}`,
  )
}

function isExactNodeCommand(
  command: string,
  expectedArguments: string,
): boolean {
  const expected = escapeRegularExpression(normalizeCommand(expectedArguments))
  return new RegExp(`^(?:node|\\S*/node) ${expected}$`).test(
    normalizeCommand(command),
  )
}

function normalizeCommand(command: string): string {
  return command.trim().replace(/\s+/g, ' ')
}

function escapeRegularExpression(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
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

async function assertExactLoopbackListener(
  pid: number,
  port: number,
): Promise<void> {
  const { stdout } = await execFileAsync('/usr/sbin/lsof', [
    '-nP',
    '-a',
    '-p',
    String(pid),
    `-iTCP:${port}`,
    '-sTCP:LISTEN',
    '-Fn',
  ])
  const endpoints = stdout
    .split('\n')
    .filter((line) => line.startsWith('n'))
    .map((line) => line.slice(1))

  assert.deepEqual(
    endpoints,
    [`127.0.0.1:${port}`],
    'canonical Server must listen only on the IPv4 loopback address',
  )
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

async function stopProcessGroup(
  child: ChildProcess,
  ports: readonly number[],
): Promise<void> {
  const pid = child.pid
  if (!pid) throw new Error('entrypoint child had no process id')

  let forced = false
  if (await processGroupExists(pid)) {
    try {
      process.kill(-pid, 'SIGINT')
    } catch (error) {
      if (!isNoSuchProcess(error)) throw error
    }
  }

  if (!(await waitFor(() => processGroupGone(pid), shutdownTimeoutMs))) {
    forced = true
    try {
      process.kill(-pid, 'SIGKILL')
    } catch (error) {
      if (!isNoSuchProcess(error)) throw error
    }
    await waitFor(() => processGroupGone(pid), 2_000)
  }

  if (!(await waitFor(() => portsAvailable(ports), shutdownTimeoutMs))) {
    throw new Error(`entrypoint did not release ports: ${ports.join(', ')}`)
  }
  if (forced) {
    throw new Error('entrypoint required SIGKILL after the shutdown deadline')
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

async function reservePort(): Promise<number> {
  return new Promise<number>((resolve, reject) => {
    const server = createServer()
    server.once('error', reject)
    server.listen(0, '127.0.0.1', () => {
      const address = server.address()
      if (!address || typeof address === 'string') {
        reject(new Error('expected an ephemeral TCP port'))
        return
      }
      server.close((error) => (error ? reject(error) : resolve(address.port)))
    })
  })
}

async function prepareConfiguredRoots(prefix: string): Promise<{
  readonly codexHome: string
  readonly home: string
  readonly root: string
  readonly sqliteHome: string
  readonly tempDirectory: string
}> {
  const root = await mkdtemp(path.join(tmpdir(), prefix))
  const result = {
    root,
    home: path.join(root, 'home'),
    codexHome: path.join(root, 'codex-home'),
    sqliteHome: path.join(root, 'sqlite-home'),
    tempDirectory: path.join(root, 'temp'),
  }
  await Promise.all(
    [result.home, result.codexHome, result.sqliteHome, result.tempDirectory].map(
      (directory) => mkdir(directory, { recursive: true }),
    ),
  )
  return result
}

async function requirePath(filePath: string, label: string): Promise<void> {
  try {
    await access(filePath)
  } catch {
    throw new BlockedError(`${label} is missing`)
  }
}

async function requireAbsent(filePath: string, label: string): Promise<void> {
  try {
    await stat(filePath)
  } catch (error) {
    if (isNoSuchFile(error)) return
    throw error
  }
  throw new BlockedError(`${label} must be absent for the controlled gate`)
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
  return (
    error instanceof BlockedError ||
    error instanceof errors.TimeoutError
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
