import assert from 'node:assert/strict'
import { mkdir, mkdtemp, rm } from 'node:fs/promises'
import type { AddressInfo } from 'node:net'
import { tmpdir } from 'node:os'
import path from 'node:path'
import test from 'node:test'

import type { CodexChatRuntime } from '@ay-ple/codex-chat-runtime'

import {
  codexChatIdentity,
  ControlledRuntime,
  createDeferred,
  postJson,
} from './testing/codex-chat-test-support.js'
import {
  createServerApp,
  type CreateServerAppOptions,
} from './server.js'
import { withTestServer } from './testing/test-server.js'

test('Codex Chat remains closed without configuration and reports exact safe status', async () => {
  await withTestServer({}, async (baseUrl) => {
    const statusResponse = await fetch(`${baseUrl}/api/codex-chat/status`)

    assert.equal(statusResponse.status, 200)
    assert.deepEqual(await statusResponse.json(), {
      state: 'unavailable',
      approvalMode: 'deny_all',
      sandbox: 'read_only',
      reason: 'not_configured',
    })

    const mutationResponse = await fetch(`${baseUrl}/api/codex-chat/threads`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: '{}',
    })

    assert.equal(mutationResponse.status, 503)
    assert.deepEqual(await mutationResponse.json(), {
      code: 'codex_chat_unavailable',
      displayMessage: 'Codex Chat is unavailable.',
    })
  })
})

test('Express-only compatibility factory cannot activate the persistent Codex Chat runtime', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'codex-chat-legacy-factory-'))
  let factoryCalls = 0
  const options: CreateServerAppOptions = {
    runtimeHistoryDirectory: path.join(root, 'runs'),
    codexChat: {
      ...codexChatIdentity,
      createRuntime: async () => {
        factoryCalls += 1
        return new ControlledRuntime()
      },
    },
  }
  const app = await createServerApp(options)
  const listener = app.listen(0, '127.0.0.1')
  try {
    await new Promise<void>((resolve, reject) => {
      listener.once('listening', resolve)
      listener.once('error', reject)
    })
    const address = listener.address() as AddressInfo
    const status = await fetch(
      `http://127.0.0.1:${address.port}/api/codex-chat/status`,
    )

    assert.deepEqual(await status.json(), {
      state: 'unavailable',
      approvalMode: 'deny_all',
      sandbox: 'read_only',
      reason: 'not_configured',
    })
    assert.equal(factoryCalls, 0)
  } finally {
    await new Promise<void>((resolve, reject) => {
      listener.close((error) => (error ? reject(error) : resolve()))
    })
    await rm(root, { force: true, recursive: true })
  }
})

test('Codex Chat contains partial and missing runtime configuration without blocking legacy routes', async () => {
  await withTestServer(
    {
      codexChatEnvironment: {
        CODEX_CHAT_RUNTIME_ROOT: '/only-one-value',
      },
    },
    async (baseUrl) => {
      const statusResponse = await fetch(`${baseUrl}/api/codex-chat/status`)
      const healthResponse = await fetch(`${baseUrl}/api/health`)

      assert.deepEqual(await statusResponse.json(), {
        state: 'unavailable',
        approvalMode: 'deny_all',
        sandbox: 'read_only',
        reason: 'invalid_configuration',
      })
      assert.equal(healthResponse.status, 200)
    },
  )

  await withTestServer(
    {
      codexChat: {
        ...codexChatIdentity,
        origin: 'https://example.com',
        createRuntime: async () => new ControlledRuntime(),
      },
    },
    async (baseUrl) => {
      assert.deepEqual(
        await (await fetch(`${baseUrl}/api/codex-chat/status`)).json(),
        {
          state: 'unavailable',
          approvalMode: 'deny_all',
          sandbox: 'read_only',
          reason: 'invalid_configuration',
        },
      )
    },
  )

  const root = await mkdtemp(path.join(tmpdir(), 'codex-chat-config-test-'))
  try {
    const directories = ['workspace', 'home', 'codex', 'sqlite', 'temp']
    await Promise.all(
      directories.map((directory) =>
        mkdir(path.join(root, directory), { recursive: true }),
      ),
    )
    await withTestServer(
      {
        codexChatEnvironment: {
          CODEX_CHAT_RUNTIME_ROOT: path.join(root, 'missing-runtime'),
          CODEX_CHAT_WORKSPACE: path.join(root, 'workspace'),
          CODEX_CHAT_RUNTIME_HOME: path.join(root, 'home'),
          CODEX_CHAT_CODEX_HOME: path.join(root, 'codex'),
          CODEX_CHAT_SQLITE_HOME: path.join(root, 'sqlite'),
          CODEX_CHAT_TEMP_DIR: path.join(root, 'temp'),
        },
      },
      async (baseUrl) => {
        const statusResponse = await fetch(`${baseUrl}/api/codex-chat/status`)

        assert.deepEqual(await statusResponse.json(), {
          state: 'unavailable',
          approvalMode: 'deny_all',
          sandbox: 'read_only',
          reason: 'runtime_missing',
        })
        assert.equal(
          (
            await postJson(`${baseUrl}/api/codex-chat/threads`, {})
          ).status,
          503,
        )
      },
    )
  } finally {
    await rm(root, { force: true, recursive: true })
  }
})

test('Codex Chat reports starting and sticky safe failure without leaking startup errors', async () => {
  const runtime = new ControlledRuntime()
  const factoryCalled = createDeferred<void>()
  const factoryResult = createDeferred<CodexChatRuntime>()

  await withTestServer(
    {
      codexChat: {
        ...codexChatIdentity,
        createRuntime: () => {
          factoryCalled.resolve()
          return factoryResult.promise
        },
      },
    },
    async (baseUrl) => {
      const threadPromise = postJson(`${baseUrl}/api/codex-chat/threads`, {})
      await factoryCalled.promise

      assert.deepEqual(
        await (await fetch(`${baseUrl}/api/codex-chat/status`)).json(),
        {
          state: 'starting',
          approvalMode: 'deny_all',
          sandbox: 'read_only',
          ...codexChatIdentity,
        },
      )

      factoryResult.resolve(runtime)
      assert.equal((await threadPromise).status, 201)
    },
  )

  await withTestServer(
    {
      codexChat: {
        ...codexChatIdentity,
        createRuntime: async () => {
          throw new Error('/secret/runtime/path must not escape')
        },
      },
    },
    async (baseUrl) => {
      const response = await postJson(`${baseUrl}/api/codex-chat/threads`, {})

      assert.equal(response.status, 502)
      assert.deepEqual(await response.json(), {
        code: 'codex_chat_failed',
        displayMessage: 'The Codex Chat operation failed.',
        unknownOutcome: false,
      })
      assert.deepEqual(
        await (await fetch(`${baseUrl}/api/codex-chat/status`)).json(),
        {
          state: 'failed',
          approvalMode: 'deny_all',
          sandbox: 'read_only',
          ...codexChatIdentity,
          failureCode: 'runtime_start_failed',
        },
      )
    },
  )
})
