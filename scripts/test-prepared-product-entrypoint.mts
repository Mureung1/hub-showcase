import assert from 'node:assert/strict'
import { execFile, spawn, type ChildProcess } from 'node:child_process'
import {
  access,
  mkdir,
  mkdtemp,
  readFile,
  realpath,
  rm,
  writeFile,
} from 'node:fs/promises'
import { createServer } from 'node:net'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'

import {
  decodeTargetProductBootstrap,
  type TargetProductBootstrap,
} from '@ay-ple/product-contract'
import { chromium } from 'playwright'

const execFileAsync = promisify(execFile)
const repositoryRoot = fileURLToPath(new URL('../', import.meta.url))
const bootstrapScript = path.join(
  repositoryRoot,
  '.agents/skills/semester-workspace-init/scripts/bootstrap.mts',
)
const productionBundleScript = path.join(
  repositoryRoot,
  'packages/codex-chat-runtime/scripts/production_bundle.py',
)
const serverPort = 3000
const shellPort = 4173
const readinessTimeoutMs = 60_000
const shutdownTimeoutMs = 15_000

type Fixture = {
  readonly appDataRoot: string
  readonly codexHome: string
  readonly root: string
  readonly workspaceRoot: string
}

type StartedProduct = {
  readonly child: ChildProcess
  readonly output: { stderr: string; stdout: string }
}

async function main(): Promise<void> {
  if (process.platform !== 'darwin' || process.arch !== 'arm64') {
    throw new Error('test:product-entrypoint requires Darwin arm64')
  }
  await Promise.all([
    access(bootstrapScript),
    access(productionBundleScript),
    access(chromium.executablePath()),
    assertPortsAvailable(),
  ])

  const fixture = await prepareFixture()
  try {
    await runProductRecoveryCase(fixture)
  } finally {
    await rm(fixture.root, { force: true, recursive: true })
  }

  console.log(
    'canonical prepared product Server + Chat Shell recovery entrypoint: green',
  )
}

async function prepareFixture(): Promise<Fixture> {
  const root = await realpath(
    await mkdtemp(path.join(tmpdir(), 'ay-ple-prepared-entrypoint-')),
  )
  const workspaceRoot = path.join(root, 'semester-workspace')
  const codexHome = path.join(root, 'codex-home')
  const appDataRoot = path.join(root, 'app-data')
  await Promise.all([mkdir(workspaceRoot), mkdir(codexHome)])
  await git(workspaceRoot, ['init', '--quiet'])
  await git(workspaceRoot, ['config', 'user.name', 'AY-PLE Entrypoint'])
  await git(workspaceRoot, ['config', 'user.email', 'entrypoint@ay-ple.invalid'])
  await writeFile(
    path.join(workspaceRoot, 'notes.md'),
    '# 학기 메모\n\n준비된 workspace입니다.\n',
  )
  await git(workspaceRoot, ['add', '--', 'notes.md'])
  await git(workspaceRoot, ['commit', '--quiet', '-m', 'chore: seed workspace'])
  await execFileAsync(
    process.execPath,
    [
      '--import',
      'tsx',
      bootstrapScript,
      '--target',
      workspaceRoot,
      '--year-level',
      '2',
      '--term-key',
      'fall',
      '--term-display-name',
      '2학기',
    ],
    { cwd: repositoryRoot },
  )
  const canonicalWorkspace = await realpath(workspaceRoot)
  const projectConfigPath = path.join(workspaceRoot, '.codex', 'config.toml')
  const projectConfig = await readFile(projectConfigPath, 'utf8')
  await writeFile(
    projectConfigPath,
    projectConfig.replace(
      /^command = .*$/mu,
      'command = "./missing-interaction-adapter"',
    ),
  )
  await writeFile(
    path.join(codexHome, 'config.toml'),
    [
      `[projects.${JSON.stringify(canonicalWorkspace)}]`,
      'trust_level = "trusted"',
      '',
    ].join('\n'),
  )
  await execFileAsync(
    'uv',
    [
      'run',
      '--isolated',
      '--no-project',
      '--no-config',
      '--no-env-file',
      '--no-python-downloads',
      '--python',
      '3.10',
      'python',
      productionBundleScript,
      'materialize',
      '--app-data-root',
      appDataRoot,
    ],
    { cwd: repositoryRoot },
  )
  return {
    appDataRoot,
    codexHome,
    root,
    workspaceRoot: canonicalWorkspace,
  }
}

async function runProductRecoveryCase(
  fixture: Fixture,
): Promise<TargetProductBootstrap> {
  const arguments_ = [
    'run',
    'dev',
    '--',
    '--app-data-root',
    fixture.appDataRoot,
    '--workspace',
    fixture.workspaceRoot,
  ]
  const started = startProduct(arguments_, fixture)
  try {
    const bootstrap = await pollBootstrap(started, readinessTimeoutMs)
    assert.equal(bootstrap.workspaceLifecycle.state, 'recovery_required')
    if (bootstrap.workspaceLifecycle.state !== 'recovery_required') {
      throw new Error('prepared entrypoint must expose recovery')
    }
    assert.equal(bootstrap.workspaceLifecycle.reason, 'runtime_unavailable')
    assert.equal(bootstrap.activeOperation, null)
    assert.equal(
      bootstrap.accountReadiness.state,
      'unavailable',
      'failed Runtime readiness must not project a usable account',
    )
    assert.equal(
      started.output.stdout.includes(
        `SemesterWorkspace: ${fixture.workspaceRoot} (explicit)`,
      ),
      true,
    )
    assert.equal(
      started.output.stdout.includes(`Product app data: ${fixture.appDataRoot}`),
      true,
    )
    const adapterFailureLogged = await waitFor(
      () =>
        started.output.stdout.includes(
          'SemesterWorkspace recovery: adapter_handshake',
        ),
      shutdownTimeoutMs,
    )
    assert.equal(
      adapterFailureLogged,
      true,
      `the smoke must reach and fail the exact Adapter handshake gate\n${started.output.stdout}`,
    )
    await assert.rejects(
      access(
        path.join(
          fixture.appDataRoot,
          'state',
          'workspace-registry.json',
        ),
      ),
      { code: 'ENOENT' },
    )
    await verifyBrowser()
    await verifyPublicRoutes()
    return bootstrap
  } finally {
    await stopProduct(started.child)
  }
}

function startProduct(
  arguments_: readonly string[],
  fixture: Fixture,
): StartedProduct {
  const output = { stderr: '', stdout: '' }
  const child = spawn('npm', arguments_, {
    cwd: repositoryRoot,
    detached: true,
    env: controlledEnvironment(fixture.codexHome),
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  child.stdout?.on('data', (chunk: Buffer) => {
    output.stdout += chunk.toString('utf8')
  })
  child.stderr?.on('data', (chunk: Buffer) => {
    output.stderr += chunk.toString('utf8')
  })
  return { child, output }
}

async function pollBootstrap(
  started: StartedProduct,
  timeoutMs: number,
): Promise<TargetProductBootstrap> {
  const deadline = Date.now() + timeoutMs
  let lastBootstrap: TargetProductBootstrap | undefined
  while (Date.now() < deadline) {
    if (started.child.exitCode !== null) {
      throw new Error(
        `entrypoint exited before readiness\nstdout:\n${started.output.stdout}\nstderr:\n${started.output.stderr}`,
      )
    }
    try {
      const response = await fetch(
        `http://127.0.0.1:${shellPort}/api/product/bootstrap`,
      )
      if (response.ok) {
        const bootstrap = decodeTargetProductBootstrap(await response.json())
        lastBootstrap = bootstrap
        if (bootstrap.workspaceLifecycle.state !== 'starting') return bootstrap
      }
    } catch {
      // The Server and Vite start independently; retry until both are ready.
    }
    await delay(100)
  }
  throw new Error(
    `entrypoint readiness timed out\nbootstrap:\n${JSON.stringify(lastBootstrap)}\nstdout:\n${started.output.stdout}\nstderr:\n${started.output.stderr}`,
  )
}

async function verifyBrowser(): Promise<void> {
  const browser = await chromium.launch({ headless: true })
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
    await page.goto(`http://127.0.0.1:${shellPort}`, {
      waitUntil: 'domcontentloaded',
      timeout: readinessTimeoutMs,
    })
    await page
      .getByRole('alert', { name: 'AY 작업공간 상태' })
      .waitFor({ timeout: readinessTimeoutMs })
    assert.equal(
      await page.getByRole('complementary', { name: 'AY Chat' }).count(),
      0,
    )
    assert.equal(await page.getByText('현재 과목', { exact: true }).count(), 0)
    assert.equal(await page.getByText('학기 자료', { exact: true }).count(), 0)
    assert.equal(
      await page.getByRole('button', { name: /첫 과제|다시 시도/u }).count(),
      0,
    )
  } finally {
    await browser.close()
  }
}

async function verifyPublicRoutes(): Promise<void> {
  for (const route of [
    '/api/product/workspaces/activate',
    '/api/product/courses',
    '/api/product/materials/refresh',
    '/api/product/actions/first-assignment',
    '/api/product/actions/first-assignment/retry',
    '/api/product-mcp',
  ]) {
    const response = await fetch(`http://127.0.0.1:${serverPort}${route}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: '{}',
    })
    assert.equal(response.status, 404, route)
  }
  const legacyChat = await fetch(
    `http://127.0.0.1:${serverPort}/api/product/chat/messages`,
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ text: '도와 줘.', materials: [] }),
    },
  )
  assert.equal(legacyChat.status, 400)
}

async function stopProduct(child: ChildProcess): Promise<void> {
  if (!child.pid) return
  const pid = child.pid
  if (child.exitCode === null) process.kill(-pid, 'SIGINT')
  const graceful = await waitForChildExit(child, shutdownTimeoutMs)
  let reaped = await waitFor(
    () => !processGroupExists(pid),
    shutdownTimeoutMs,
  )
  if (!reaped) {
    try {
      process.kill(-pid, 'SIGKILL')
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ESRCH') throw error
    }
    reaped = await waitFor(() => !processGroupExists(pid), shutdownTimeoutMs)
  }
  await assertPortsAvailable()
  if (!graceful) {
    throw new Error('canonical product entrypoint did not stop on SIGINT')
  }
  if (!reaped) {
    throw new Error('canonical product entrypoint left an orphan process group')
  }
}

async function waitForChildExit(
  child: ChildProcess,
  timeoutMs: number,
): Promise<boolean> {
  if (child.exitCode !== null) return true
  return Promise.race([
    new Promise<boolean>((resolve) => child.once('exit', () => resolve(true))),
    delay(timeoutMs).then(() => false),
  ])
}

function controlledEnvironment(codexHome: string): NodeJS.ProcessEnv {
  const environment = { ...process.env }
  for (const key of Object.keys(environment)) {
    if (
      key === 'CODEX_HOME' ||
      key === 'PORT' ||
      key.startsWith('AY_PLE_') ||
      key.startsWith('CODEX_CHAT_')
    ) {
      delete environment[key]
    }
  }
  return {
    ...environment,
    BROWSER: 'none',
    CODEX_HOME: codexHome,
    NO_COLOR: '1',
  }
}

async function assertPortsAvailable(): Promise<void> {
  await Promise.all([serverPort, shellPort].map(assertPortAvailable))
}

async function assertPortAvailable(port: number): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const server = createServer()
    server.once('error', reject)
    server.listen(port, '127.0.0.1', () => {
      server.close((error) => (error ? reject(error) : resolve()))
    })
  })
}

function processGroupExists(pid: number): boolean {
  try {
    process.kill(-pid, 0)
    return true
  } catch (error) {
    return (error as NodeJS.ErrnoException).code !== 'ESRCH'
  }
}

async function waitFor(
  predicate: () => boolean,
  timeoutMs: number,
): Promise<boolean> {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    if (predicate()) return true
    await delay(50)
  }
  return predicate()
}

async function git(cwd: string, arguments_: readonly string[]): Promise<void> {
  await execFileAsync('git', arguments_, { cwd })
}

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds))
}

void main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exitCode = 1
})
