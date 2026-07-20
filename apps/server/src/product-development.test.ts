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

    const application = await createServerApplication({
      codexChatEnvironment: {},
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
        (await application.semesterWorkspace?.refreshMaterials())?.materials,
        [],
      )
    } finally {
      await application.close()
    }
  } finally {
    await rm(testRoot, { force: true, recursive: true })
  }
})

test('canonical product startup serves an actionable incompatible workspace snapshot', async () => {
  const testRoot = await mkdtemp(
    path.join(tmpdir(), 'ay-ple-product-incompatible-startup-test-'),
  )
  const packageRoot = path.join(testRoot, 'package')
  const appDataRoot = path.join(testRoot, 'app-data')
  const workspaceRoot = path.join(testRoot, 'semester')
  const productRoot = path.join(workspaceRoot, '.ay-ple')
  const storePath = path.join(productRoot, 'workspace-state.json')
  const newerStore = '{"formatVersion":3,"futureState":"keep exactly"}\n'

  try {
    await Promise.all(
      [packageRoot, appDataRoot, productRoot].map((root) =>
        mkdir(root, { recursive: true }),
      ),
    )
    await writeFile(storePath, newerStore, 'utf8')

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
        workspace: {
          state: 'incompatible',
          readOnly: true,
          displayMessage:
            '이 SemesterWorkspace는 더 최신 버전의 AY-PLE에서 생성되었습니다. 최신 AY-PLE로 다시 여세요.',
        },
      })
      assert.equal(await readFile(storePath, 'utf8'), newerStore)
    } finally {
      await started.application.close()
    }
  } finally {
    await rm(testRoot, { force: true, recursive: true })
  }
})
