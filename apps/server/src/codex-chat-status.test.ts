import assert from 'node:assert/strict'
import { mkdir, mkdtemp, rm } from 'node:fs/promises'
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

test('Server exposes no legacy health or Runtime Harness routes', async () => {
  await withTestServer({}, async (baseUrl) => {
    for (const route of ['/api/health', '/api/runtime/adapters']) {
      assert.equal((await fetch(`${baseUrl}${route}`)).status, 404)
    }
  })
})

test('Codex Chat contains partial and missing runtime configuration and keeps mutations closed', async () => {
  await withTestServer(
    {
      codexChatEnvironment: {
        CODEX_CHAT_RUNTIME_ROOT: '/only-one-value',
      },
    },
    async (baseUrl) => {
      const statusResponse = await fetch(`${baseUrl}/api/codex-chat/status`)

      assert.deepEqual(await statusResponse.json(), {
        state: 'unavailable',
        approvalMode: 'deny_all',
        sandbox: 'read_only',
        reason: 'invalid_configuration',
      })
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
