import assert from 'node:assert/strict'
import { execFile } from 'node:child_process'
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
import { promisify } from 'node:util'
import { fileURLToPath } from 'node:url'

import type {
  ProductWorkspaceLifecycle,
  TargetProductBootstrap,
} from '@ay-ple/product-contract'
import {
  createInitialSemesterWorkspaceStateV4,
  encodeSemesterWorkspaceStateV4,
} from '@ay-ple/semester-workspace'
import react from '@vitejs/plugin-react'
import { expect, test, type Page } from 'playwright/test'
import {
  createServer as createViteServer,
  type Plugin,
  type ViteDevServer,
} from 'vite'

import {
  PreparedWorkspaceStartupError,
  startPreparedWorkspace,
  type PreparedWorkspaceActiveSession,
  type PreparedWorkspaceStartupPorts,
} from '../../server/src/prepared-workspace-startup.js'
import { bindServerApplicationListener } from '../../server/src/server-listener.js'

const execFileAsync = promisify(execFile)
const chatShellRoot = fileURLToPath(new URL('../', import.meta.url))
const registryRelativePath = path.join(
  'state',
  'workspace-registry.json',
)
const previousWorkspaceId =
  'workspace_11111111111111111111111111111111'
const targetWorkspaceId =
  'workspace_22222222222222222222222222222222'
const previousWorkspace = {
  workspaceId: previousWorkspaceId,
  semester: {
    yearLevel: 2,
    term: { key: 'fall', displayName: '2학기' },
  },
  label: '2학년 2학기',
} as const
const targetWorkspace = {
  workspaceId: targetWorkspaceId,
  semester: {
    yearLevel: 2,
    term: { key: 'spring', displayName: '1학기' },
  },
  label: '2학년 1학기',
} as const

let viteServer: ViteDevServer
let targetUrl: string
let lifecycleSourceOrigin: string | undefined
let generation = 0

test.describe.configure({ mode: 'serial' })

test.beforeAll(async () => {
  viteServer = await createViteServer({
    configFile: false,
    root: chatShellRoot,
    plugins: [react(), lifecycleProxy()],
    server: {
      host: '127.0.0.1',
      port: 0,
      strictPort: false,
    },
  })
  await viteServer.listen()
  const origin = viteServer.resolvedUrls?.local[0]
  if (!origin) throw new Error('Workspace lifecycle Vite URL is missing')
  targetUrl = new URL('/e2e/workspace-lifecycle-target.html', origin).href
})

test.afterAll(async () => {
  await viteServer.close()
})

test('projects path-free recovery states without candidate controls', async ({
  page,
}) => {
  const scenarios = [
    {
      lifecycle: {
        state: 'recovery_required',
        workspace: {
          availability: 'unavailable',
          workspaceId: previousWorkspace.workspaceId,
          label: '등록된 학기 작업공간',
        },
        reason: 'workspace_unavailable',
        displayMessage: '등록된 SemesterWorkspace를 다시 확인해 주세요.',
      },
      heading: '등록된 학기 작업공간을 열 수 없습니다',
    },
    {
      lifecycle: {
        state: 'recovery_required',
        workspace: {
          availability: 'available',
          ...targetWorkspace,
        },
        reason: 'runtime_unavailable',
        displayMessage: 'Workspace Runtime을 계속 사용할 수 없습니다.',
      },
      heading: 'AY Runtime을 계속 사용할 수 없습니다',
    },
    {
      lifecycle: {
        state: 'recovery_required',
        workspace: null,
        reason: 'registry_incompatible',
        displayMessage: 'WorkspaceRegistry 원본을 보존한 채 멈췄습니다.',
      },
      heading: 'WorkspaceRegistry를 확인해야 합니다',
    },
    {
      lifecycle: {
        state: 'recovery_required',
        workspace: null,
        reason: 'prepared_workspace_required',
        displayMessage: '준비된 SemesterWorkspace가 필요합니다.',
      },
      heading: '준비된 학기 작업공간이 필요합니다',
    },
  ] as const satisfies readonly {
    readonly lifecycle: ProductWorkspaceLifecycle
    readonly heading: string
  }[]

  for (const scenario of scenarios) {
    const source = await bindLifecycleSource(scenario.lifecycle)
    try {
      await page.goto(targetUrl)
      await expectLifecycle(page, 'recovery_required', scenario.heading)
      await expect(page.getByRole('button')).toHaveCount(0)
      await expect(page.getByText('/private/semester')).toHaveCount(0)
    } finally {
      await source.close()
    }
  }
})

test('uses the prepared startup seam for fresh reopen and failed-switch recovery', async ({
  page,
}) => {
  const fixture = await createRelaunchFixture()
  let session: PreparedWorkspaceActiveSession | undefined
  try {
    const first = createDeterministicPorts({
      expectedWorkspaceId: previousWorkspaceId,
    })
    session = await startPreparedWorkspace({
      appDataRoot: fixture.appDataRoot,
      explicitWorkspaceRoot: fixture.previousRoot,
      ports: first.ports,
    })
    await page.goto(targetUrl)
    await expectLifecycle(
      page,
      'active',
      '2학년 2학기 작업공간이 준비되었습니다',
    )
    await session.close()
    session = undefined

    const reopened = createDeterministicPorts({
      expectedWorkspaceId: previousWorkspaceId,
      holdStartup: true,
    })
    const reopenPromise = startPreparedWorkspace({
      appDataRoot: fixture.appDataRoot,
      ports: reopened.ports,
    })
    await reopened.listenerBound
    await page.goto(targetUrl)
    await expectLifecycle(
      page,
      'starting',
      '2학년 2학기 작업공간을 여는 중입니다',
    )
    reopened.releaseStartup()
    session = await reopenPromise
    await page.reload()
    await expectLifecycle(
      page,
      'active',
      '2학년 2학기 작업공간이 준비되었습니다',
    )
    assert.notEqual(reopened.threadId, first.threadId)
    assert.notEqual(reopened.brokerToken, first.brokerToken)
    assert.equal(reopened.runtimeRoot(), fixture.previousRoot)
    await session.close()
    session = undefined

    const registryBeforeFailure = await registryBytes(fixture.appDataRoot)
    const userBytesBeforeFailure = await readFile(fixture.userFile)
    const failed = createDeterministicPorts({ fault: 'roster' })
    await assert.rejects(
      startPreparedWorkspace({
        appDataRoot: fixture.appDataRoot,
        explicitWorkspaceRoot: fixture.targetRoot,
        ports: failed.ports,
      }),
      (error: unknown) =>
        error instanceof PreparedWorkspaceStartupError &&
        error.stage === 'required_tool_roster',
    )
    assert.deepEqual(
      await registryBytes(fixture.appDataRoot),
      registryBeforeFailure,
    )
    assert.deepEqual(await readFile(fixture.userFile), userBytesBeforeFailure)

    const recovered = createDeterministicPorts({
      expectedWorkspaceId: previousWorkspaceId,
    })
    session = await startPreparedWorkspace({
      appDataRoot: fixture.appDataRoot,
      ports: recovered.ports,
    })
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto(targetUrl)
    await expectLifecycle(
      page,
      'active',
      '2학년 2학기 작업공간이 준비되었습니다',
    )
    await expect(page.getByRole('button')).toHaveCount(0)
    await expect(page.locator('body')).not.toContainText(fixture.previousRoot)
    assert.equal(recovered.runtimeRoot(), fixture.previousRoot)
    assert.notEqual(recovered.threadId, failed.threadId)
    assert.notEqual(recovered.brokerToken, failed.brokerToken)
    await session.close()
    session = undefined

    const switched = createDeterministicPorts()
    session = await startPreparedWorkspace({
      appDataRoot: fixture.appDataRoot,
      explicitWorkspaceRoot: fixture.targetRoot,
      ports: switched.ports,
    })
    await page.setViewportSize({ width: 1920, height: 1080 })
    await page.goto(targetUrl)
    await expectLifecycle(
      page,
      'active',
      '2학년 1학기 작업공간이 준비되었습니다',
    )
    await expect(page.getByRole('button')).toHaveCount(0)
    await expect(page.locator('body')).not.toContainText(fixture.targetRoot)
    assert.equal(switched.runtimeRoot(), fixture.targetRoot)
  } finally {
    await session?.close()
    await fixture.cleanup()
  }
})

function lifecycleProxy(): Plugin {
  return {
    name: 'workspace-lifecycle-e2e-proxy',
    configureServer(server) {
      server.middlewares.use(
        '/api/product/bootstrap',
        async (_request, response) => {
          if (!lifecycleSourceOrigin) {
            response.statusCode = 503
            response.end('Lifecycle source is unavailable')
            return
          }
          try {
            const upstream = await fetch(
              `${lifecycleSourceOrigin}/api/product/bootstrap`,
              { cache: 'no-store' },
            )
            response.statusCode = upstream.status
            response.setHeader(
              'content-type',
              upstream.headers.get('content-type') ?? 'application/json',
            )
            response.end(await upstream.text())
          } catch {
            response.statusCode = 502
            response.end('Lifecycle source request failed')
          }
        },
      )
    },
  }
}

async function bindLifecycleSource(
  lifecycle: ProductWorkspaceLifecycle,
): Promise<{ close(): Promise<void> }> {
  const listener = await bindServerApplicationListener({
    host: '127.0.0.1',
    port: 0,
    requestHandler: (_request, response) => {
      respondWithBootstrap(response, lifecycle)
    },
  })
  lifecycleSourceOrigin = `http://127.0.0.1:${listener.port}`
  return {
    async close() {
      await listener.close({ signal: new AbortController().signal })
    },
  }
}

function createDeterministicPorts(
  options: {
    readonly expectedWorkspaceId?: string
    readonly fault?: 'roster'
    readonly holdStartup?: boolean
  } = {},
): {
  readonly ports: PreparedWorkspaceStartupPorts
  readonly listenerBound: Promise<void>
  readonly threadId: string
  readonly brokerToken: string
  releaseStartup(): void
  runtimeRoot(): string | undefined
} {
  const id = (++generation).toString(16).padStart(32, '0')
  const threadId = `thread/browser-${id}`
  const brokerToken = `broker-token-${id}`
  const listenerBound = deferred<void>()
  const startupGate = deferred<void>()
  const terminal = deferred<void>()
  let runtimeRoot: string | undefined

  return {
    listenerBound: listenerBound.promise,
    threadId,
    brokerToken,
    releaseStartup: () => startupGate.resolve(undefined),
    runtimeRoot: () => runtimeRoot,
    ports: {
      async bindSharedListener(input) {
        const listener = await bindServerApplicationListener({
          host: '127.0.0.1',
          port: 0,
          requestHandler: (_request, response) => {
            respondWithBootstrap(response, input.readLifecycle())
          },
        })
        lifecycleSourceOrigin = `http://127.0.0.1:${listener.port}`
        listenerBound.resolve(undefined)
        return {
          port: listener.port,
          async close() {
            await listener.close({
              signal: new AbortController().signal,
            })
          },
        }
      },
      async prepareBrokerGeneration(input) {
        return {
          childEnvironment: {
            AY_PLE_INTERACTION_BROKER_URL:
              `http://127.0.0.1:${input.listenerPort}/api/_private/interaction-mcp`,
            AY_PLE_INTERACTION_BROKER_TOKEN: brokerToken,
            AY_PLE_INTERACTION_RUNTIME_BINDING:
              `runtime_${id}`,
          },
          async runtimeTerminal() {},
          async adapterLost() {},
          async appShutdown() {},
        }
      },
      async spawnWorkspaceRuntime(input) {
        runtimeRoot = input.canonicalRoot
        return {
          terminal: terminal.promise,
          async loadNativeProjectConfig() {
            if (options.holdStartup) await startupGate.promise
            return {
              projectRootMarkers: ['.git'],
              globalInstructionsFile: null,
              mcpServers: [
                {
                  name: 'ay_ple_interaction',
                  enabled: true,
                  required: true,
                  enabledTools: ['propose_state_patch'],
                },
              ],
            }
          },
          async startWorkspaceThread() {
            return { threadId }
          },
          async waitForRequiredMcp(waitInput) {
            assert.equal(waitInput.threadId, threadId)
            assert.equal(waitInput.serverName, 'ay_ple_interaction')
            assert.deepEqual(waitInput.expectedTools, [
              'propose_state_patch',
            ])
            if (options.fault === 'roster') {
              throw new Error('deterministic roster failure')
            }
          },
          async confirmThreadContext(context) {
            const canonicalRoot = (
              await execFileAsync('git', [
                '-C',
                context.canonicalRoot,
                'rev-parse',
                '--show-toplevel',
              ])
            ).stdout.trim()
            assert.equal(canonicalRoot, context.canonicalRoot)
            assert.equal(context.threadId, threadId)
            assert.equal(
              context.workspaceId,
              options.expectedWorkspaceId ?? targetWorkspaceId,
            )
          },
          monitorRequiredMcp(monitorInput) {
            assert.equal(monitorInput.threadId, threadId)
            return {
              lost: new Promise(() => undefined),
              async close() {},
            }
          },
          async close() {},
        }
      },
    },
  }
}

function respondWithBootstrap(
  response: import('node:http').ServerResponse,
  lifecycle: ProductWorkspaceLifecycle,
): void {
  const bootstrap = {
    accountReadiness: { state: 'ready' },
    workspaceLifecycle: lifecycle,
    activeOperation: null,
  } satisfies TargetProductBootstrap
  response.statusCode = 200
  response.setHeader('cache-control', 'no-store')
  response.setHeader('content-type', 'application/json')
  response.end(JSON.stringify(bootstrap))
}

async function expectLifecycle(
  page: Page,
  state: ProductWorkspaceLifecycle['state'],
  heading: string,
): Promise<void> {
  const surface = page.locator('[data-workspace-lifecycle]')
  await expect(surface).toHaveAttribute('data-workspace-lifecycle', state)
  await expect(
    page.getByRole(
      state === 'recovery_required' ? 'alert' : 'status',
      { name: 'AY 작업공간 상태' },
    ),
  ).toContainText(heading)
}

async function createRelaunchFixture(): Promise<{
  readonly appDataRoot: string
  readonly previousRoot: string
  readonly targetRoot: string
  readonly userFile: string
  cleanup(): Promise<void>
}> {
  const root = await realpath(
    await mkdtemp(path.join(tmpdir(), 'workspace-lifecycle-browser-')),
  )
  const appDataRoot = path.join(root, 'app-data')
  const previousRoot = path.join(root, 'previous')
  const targetRoot = path.join(root, 'target')
  await mkdir(appDataRoot)
  await Promise.all([
    prepareWorkspace(previousRoot, previousWorkspace),
    prepareWorkspace(targetRoot, targetWorkspace),
  ])
  const userFile = path.join(previousRoot, 'notes', 'user.txt')
  await mkdir(path.dirname(userFile))
  await writeFile(userFile, '사용자가 보존해야 하는 학기 기록\n', 'utf8')
  return {
    appDataRoot,
    previousRoot,
    targetRoot,
    userFile,
    cleanup: () => rm(root, { force: true, recursive: true }),
  }
}

async function prepareWorkspace(
  root: string,
  workspace: typeof previousWorkspace | typeof targetWorkspace,
): Promise<void> {
  await mkdir(root)
  await execFileAsync('git', ['init', '--quiet', root])
  await writeFile(
    path.join(root, 'workspace-state.json'),
    encodeSemesterWorkspaceStateV4(
      createInitialSemesterWorkspaceStateV4({
        workspaceId: workspace.workspaceId,
        semester: workspace.semester,
      }),
    ),
  )
}

async function registryBytes(appDataRoot: string): Promise<Buffer> {
  return readFile(path.join(appDataRoot, registryRelativePath))
}

function deferred<T>(): {
  readonly promise: Promise<T>
  readonly resolve: (value: T | PromiseLike<T>) => void
} {
  let resolve!: (value: T | PromiseLike<T>) => void
  const promise = new Promise<T>((settle) => {
    resolve = settle
  })
  return { promise, resolve }
}
