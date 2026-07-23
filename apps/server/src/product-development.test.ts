import assert from 'node:assert/strict'
import { mkdir, mkdtemp, readFile, realpath, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import test from 'node:test'

import {
  ProductDevelopmentBootstrapError,
  resolveProductDevelopmentBootstrap,
} from './product-development.js'
import {
  createServerApplication,
  startConfiguredServerApplication,
} from './server.js'

test('product development bootstrap fails closed without explicit appDataRoot', () => {
  assert.throws(
    () =>
      resolveProductDevelopmentBootstrap({
        AY_PLE_PRODUCT_MODE: '1',
        AY_PLE_PACKAGE_ROOT: '/explicit/package',
        AY_PLE_WORKSPACE_ROOT: '/explicit/workspace',
        CODEX_CHAT_RUNTIME_HOME: '/must/not/be/reused',
      }),
    (error: unknown) =>
      error instanceof ProductDevelopmentBootstrapError &&
      error.code === 'product_app_data_root_required',
  )

  assert.equal(
    resolveProductDevelopmentBootstrap({
      CODEX_CHAT_RUNTIME_HOME: '/chat-only/runtime-home',
      CODEX_CHAT_WORKSPACE: '/chat-only/workspace',
    }),
    undefined,
  )
})

test('product development bootstrap activates and reports its explicit selected workspace', async () => {
  const testRoot = await mkdtemp(path.join(tmpdir(), 'ay-ple-product-dev-test-'))
  const packageRoot = path.join(testRoot, 'package')
  const appDataRoot = path.join(testRoot, 'app-data')
  const workspaceRoot = path.join(testRoot, 'semester')

  try {
    await Promise.all(
      [packageRoot, appDataRoot, workspaceRoot].map((root) => mkdir(root)),
    )
    const product = resolveProductDevelopmentBootstrap({
      AY_PLE_PRODUCT_MODE: '1',
      AY_PLE_PACKAGE_ROOT: packageRoot,
      AY_PLE_APP_DATA_ROOT: appDataRoot,
      AY_PLE_WORKSPACE_ROOT: workspaceRoot,
    })
    assert.ok(product)
    assert.equal(product.selectedWorkspaceRoot, workspaceRoot)
    assert.deepEqual(product.runtime, {
      appDataRoot,
      runtimeRoot: path.join(
        packageRoot,
        'packages/codex-chat-runtime/.artifacts/production-runtime-darwin-arm64',
      ),
      environment: {
        home: path.join(appDataRoot, 'runtime/home'),
        codexHome: path.join(appDataRoot, 'runtime/codex-home'),
        codexSqliteHome: path.join(appDataRoot, 'runtime/codex-sqlite-home'),
        tempDirectory: path.join(appDataRoot, 'runtime/temp'),
      },
      origin: 'http://127.0.0.1:4173',
    })

    const application = await createServerApplication({
      productRuntime: product.runtime,
      semesterWorkspace: product.semesterWorkspace,
    })
    try {
      const activation = await application.semesterWorkspace?.activate()
      assert.equal(activation?.status, 'activated')
      assert.equal(
        application.semesterWorkspace?.nativeCwd(),
        await realpath(workspaceRoot),
      )
      assert.deepEqual(
        (await application.semesterWorkspace?.refreshMaterials())?.workspace
          .materials,
        [],
      )
    } finally {
      await application.close()
    }
  } finally {
    await rm(testRoot, { force: true, recursive: true })
  }
})

test('product development bootstrap ignores legacy runtime path authorities', () => {
  const product = resolveProductDevelopmentBootstrap({
    AY_PLE_PRODUCT_MODE: '1',
    AY_PLE_PACKAGE_ROOT: '/explicit/package',
    AY_PLE_APP_DATA_ROOT: '/explicit/app-data',
    AY_PLE_WORKSPACE_ROOT: '/explicit/workspace',
    CODEX_CHAT_RUNTIME_ROOT: '/legacy/runtime',
    CODEX_CHAT_RUNTIME_HOME: '/legacy/home',
    CODEX_CHAT_CODEX_HOME: '/legacy/codex-home',
    CODEX_CHAT_SQLITE_HOME: '/legacy/sqlite-home',
    CODEX_CHAT_TEMP_DIR: '/legacy/temp',
  })

  assert.equal(
    product?.runtime.runtimeRoot,
    '/explicit/package/packages/codex-chat-runtime/.artifacts/production-runtime-darwin-arm64',
  )
  assert.equal(product?.runtime.environment.home, '/explicit/app-data/runtime/home')
})

test('canonical product startup preserves caller-owned bytes and serves an incompatible snapshot', async () => {
  const testRoot = await mkdtemp(
    path.join(tmpdir(), 'ay-ple-product-incompatible-startup-test-'),
  )
  const packageRoot = path.join(testRoot, 'package')
  const appDataRoot = path.join(testRoot, 'app-data')
  const workspaceRoot = path.join(testRoot, 'semester')
  const productRoot = path.join(workspaceRoot, '.ay-ple')
  const storePath = path.join(productRoot, 'workspace-state.json')
  const sourcePath = path.join(workspaceRoot, 'caller-owned.txt')
  const newerStore = '{"formatVersion":3,"futureState":"keep exactly"}\n'
  const sourceBytes = Buffer.from('caller-owned original material', 'utf8')

  try {
    await Promise.all(
      [packageRoot, appDataRoot, productRoot].map((root) =>
        mkdir(root, { recursive: true }),
      ),
    )
    await writeFile(storePath, newerStore, 'utf8')
    await writeFile(sourcePath, sourceBytes)

    const started = await startConfiguredServerApplication({
      environment: {
        AY_PLE_PRODUCT_MODE: '1',
        AY_PLE_PACKAGE_ROOT: packageRoot,
        AY_PLE_APP_DATA_ROOT: appDataRoot,
        AY_PLE_WORKSPACE_ROOT: workspaceRoot,
      },
      host: '127.0.0.1',
      port: 0,
      log: () => undefined,
    })
    try {
      const response = await fetch(
        `http://127.0.0.1:${started.port}/api/product/bootstrap`,
      )
      assert.equal(response.status, 200)
      const internalSnapshot = started.application.semesterWorkspace?.snapshot()
      assert.equal(internalSnapshot?.state, 'incompatible')
      if (internalSnapshot?.state === 'incompatible') {
        assert.equal(internalSnapshot.supportedStoreFormatVersion, 2)
        assert.equal(internalSnapshot.foundStoreFormatVersion, 3)
      }
      assert.deepEqual(await response.json(), {
        accountReadiness: {
          state: 'unavailable',
          displayMessage:
            'Codex 상태를 확인할 수 없습니다. 자료 작업공간은 계속 사용할 수 있습니다.',
        },
        operationStatus: 'idle',
        workspace: {
          state: 'incompatible',
          readOnly: true,
          displayMessage:
            '이 SemesterWorkspace의 제품 상태는 현재 AY-PLE에서 안전하게 열 수 없습니다. 원본을 보존한 채 지원되는 AY-PLE로 다시 여세요.',
        },
        history: {
          assignments: [],
          statePatches: [],
          userConfirmations: [],
          modelingRuns: [],
        },
      })
      const removedTracerRoutes = await Promise.all([
        fetch(`http://127.0.0.1:${started.port}/api/codex-chat/status`),
        fetch(`http://127.0.0.1:${started.port}/api/codex-chat/threads`, {
          method: 'POST',
        }),
        fetch(
          `http://127.0.0.1:${started.port}/api/codex-chat/threads/old/turns`,
          { method: 'POST' },
        ),
        fetch(
          `http://127.0.0.1:${started.port}/api/codex-chat/threads/old/turns/old/interrupt`,
          { method: 'POST' },
        ),
      ])
      assert.deepEqual(
        removedTracerRoutes.map(({ status }) => status),
        [404, 404, 404, 404],
      )
      assert.equal(await readFile(storePath, 'utf8'), newerStore)
      assert.deepEqual(await readFile(sourcePath), sourceBytes)
    } finally {
      await started.application.close()
    }
  } finally {
    await rm(testRoot, { force: true, recursive: true })
  }
})

test('configured startup closes its claimed listener when post-bind logging fails', async () => {
  const loggingFailure = new Error('configured startup logger failed')
  let boundPort: number | undefined

  await assert.rejects(
    startConfiguredServerApplication({
      environment: {},
      host: '127.0.0.1',
      port: 0,
      log(message) {
        const match = /server listening on http:\/\/127\.0\.0\.1:(\d+)$/u.exec(
          message,
        )
        assert.ok(match)
        boundPort = Number(match[1])
        throw loggingFailure
      },
    }),
    (error: unknown) => error === loggingFailure,
  )

  assert.notEqual(boundPort, undefined)
  await assert.rejects(
    fetch(`http://127.0.0.1:${boundPort}/api/product/bootstrap`),
  )
})
