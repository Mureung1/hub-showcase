import assert from 'node:assert/strict'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

import {
  startCodexChatProcessTreeTestFixture,
  type CodexChatProcessTreeTestFixture,
  type CodexChatTestProcessTree,
} from '@ay-ple/codex-chat-runtime/testing'
import { decodeProductBootstrap } from '@ay-ple/product-contract'

import {
  materializeE2eSemesterWorkspace,
} from '../../../../scripts/semester-workspace-materializer.mjs'
import {
  codexChatIdentity,
  connectProductWithoutReuse,
  settlesBeforeImmediate,
} from './codex-chat-test-support.js'
import { withTestServer } from './test-server.js'

const RUNTIME_ROOT = fileURLToPath(
  new URL(
    '../../../../packages/codex-chat-runtime/.artifacts/production-runtime-darwin-arm64/',
    import.meta.url,
  ),
)

test('Product bootstrap starts a supervised Runtime that Server shutdown fully reaps', async () => {
  const materialized = await materializeE2eSemesterWorkspace()
  const packageRoot = path.join(materialized.runRoot, 'package')
  const appDataRoot = path.join(materialized.runRoot, 'app-data')
  let fixture: CodexChatProcessTreeTestFixture | undefined
  let runtimeFactoryCalls = 0
  try {
    await Promise.all([packageRoot, appDataRoot].map((root) => mkdir(root)))
    await withTestServer(
      {
        codexChat: {
          ...codexChatIdentity,
          createRuntime: async () => {
            runtimeFactoryCalls += 1
            fixture = await startCodexChatProcessTreeTestFixture({
              runtimeRoot: RUNTIME_ROOT,
              accountState: 'chatgpt',
            })
            return fixture.runtime
          },
        },
        semesterWorkspace: {
          appDataRoot,
          packageRoot,
          chooseDirectory: async () => materialized.workspaceRoot,
        },
      },
      async (baseUrl, application) => {
        try {
          const activation = await application.semesterWorkspace?.activate()
          assert.ok(activation)
          assert.equal(activation.status, 'activated')
          assert.equal(activation.workspace.state, 'ready')
          assert.equal(runtimeFactoryCalls, 0)

          const bootstrapResponse = await fetch(
            `${baseUrl}/api/product/bootstrap`,
          )
          assert.equal(bootstrapResponse.status, 200)
          const bootstrap = decodeProductBootstrap(
            await bootstrapResponse.json(),
          )
          assert.deepEqual(bootstrap.accountReadiness, { state: 'ready' })
          assert.equal(bootstrap.operationStatus, 'idle')
          assert.equal(bootstrap.workspace?.state, 'ready')
          assert.equal(runtimeFactoryCalls, 1)

          const activeFixture = fixture
          assert.ok(activeFixture)
          const processTree = await activeFixture.readProcessTree()
          assertProcessTreeRunning(processTree)

          const closing = application.close()
          await withDeadline(
            activeFixture.waitForCloseRequest(),
            3_000,
            'Server shutdown did not request runtime close',
          )
          await assert.rejects(connectProductWithoutReuse(baseUrl))
          assert.equal(await settlesBeforeImmediate(closing), false)
          assertProcessTreeRunning(processTree)

          await activeFixture.releaseClose()
          await closing
          assertProcessTreeReaped(processTree)
        } finally {
          await fixture?.releaseClose()
        }
      },
    )
  } finally {
    try {
      await fixture?.dispose()
    } finally {
      await materialized.cleanup()
    }
  }
})

test('Product bootstrap recovers Runtime readiness after activating a valid workspace', async () => {
  const testRoot = await mkdtemp(
    path.join(tmpdir(), 'ay-ple-product-runtime-recovery-'),
  )
  const packageRoot = path.join(testRoot, 'package')
  const appDataRoot = path.join(testRoot, 'app-data')
  const codexHome = path.join(testRoot, 'global-codex-home')
  const incompatibleWorkspace = path.join(testRoot, 'incompatible-workspace')
  const readyWorkspace = path.join(testRoot, 'ready-workspace')
  const choices = [incompatibleWorkspace, readyWorkspace]

  try {
    await Promise.all(
      [
        packageRoot,
        appDataRoot,
        codexHome,
        incompatibleWorkspace,
        readyWorkspace,
      ].map((root) => mkdir(root)),
    )
    const productStateRoot = path.join(incompatibleWorkspace, '.ay-ple')
    await mkdir(productStateRoot)
    await writeFile(
      path.join(productStateRoot, 'workspace-state.json'),
      '{"formatVersion":3}\n',
      'utf8',
    )

    await withTestServer(
      {
        productRuntime: {
          appDataRoot,
          packageRoot,
          runtimeRoot: RUNTIME_ROOT,
          environment: {
            home: path.join(appDataRoot, 'runtime/home'),
            codexHome,
            codexSqliteHome: path.join(
              appDataRoot,
              'runtime/codex-sqlite-home',
            ),
            tempDirectory: path.join(appDataRoot, 'runtime/temp'),
          },
          origin: 'http://127.0.0.1:4173',
        },
        semesterWorkspace: {
          appDataRoot,
          packageRoot,
          chooseDirectory: async () => choices.shift() ?? null,
        },
      },
      async (baseUrl) => {
        const incompatibleActivation = await activateWorkspace(baseUrl)
        assert.equal(incompatibleActivation.status, 200)
        assert.equal(
          ((await incompatibleActivation.json()) as {
            readonly workspace: { readonly state: string }
          }).workspace.state,
          'incompatible',
        )

        const incompatibleBootstrap = decodeProductBootstrap(
          await (await fetch(`${baseUrl}/api/product/bootstrap`)).json(),
        )
        assert.equal(incompatibleBootstrap.workspace?.state, 'incompatible')
        assert.deepEqual(incompatibleBootstrap.accountReadiness, {
          state: 'unavailable',
          displayMessage:
            'Codex 상태를 확인할 수 없습니다. 자료 작업공간은 계속 사용할 수 있습니다.',
        })

        const readyActivation = await activateWorkspace(baseUrl)
        assert.equal(readyActivation.status, 200)
        assert.equal(
          ((await readyActivation.json()) as {
            readonly workspace: { readonly state: string }
          }).workspace.state,
          'ready',
        )

        const readyBootstrap = decodeProductBootstrap(
          await (await fetch(`${baseUrl}/api/product/bootstrap`)).json(),
        )
        assert.equal(readyBootstrap.workspace?.state, 'ready')
        assert.deepEqual(readyBootstrap.accountReadiness, {
          state: 'not_ready',
          displayMessage: 'Codex에 로그인한 뒤 다시 시도해 주세요.',
        })
      },
    )
  } finally {
    await rm(testRoot, { force: true, recursive: true })
  }
})

function activateWorkspace(baseUrl: string): Promise<Response> {
  return fetch(`${baseUrl}/api/product/workspaces/activate`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: '{}',
  })
}

async function withDeadline<T>(
  promise: Promise<T>,
  milliseconds: number,
  message: string,
): Promise<T> {
  let timeout: NodeJS.Timeout | undefined
  try {
    return await Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        timeout = setTimeout(() => reject(new Error(message)), milliseconds)
      }),
    ])
  } finally {
    if (timeout) clearTimeout(timeout)
  }
}

function assertProcessTreeRunning(processTree: CodexChatTestProcessTree): void {
  assert.equal(processExists(processTree.workerPid), true)
  assert.equal(processExists(processTree.nativePid), true)
  assert.equal(processGroupExists(processTree.processGroupId), true)
}

function assertProcessTreeReaped(processTree: CodexChatTestProcessTree): void {
  assert.equal(processExists(processTree.workerPid), false)
  assert.equal(processExists(processTree.nativePid), false)
  assert.equal(processGroupExists(processTree.processGroupId), false)
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
