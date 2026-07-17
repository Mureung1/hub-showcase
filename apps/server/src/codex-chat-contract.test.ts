import assert from 'node:assert/strict'
import test from 'node:test'

import { DeterministicCodexChatRuntime } from '@ay-ple/codex-chat-runtime/testing'

import { isLoopbackAddress } from './codex-chat.js'
import {
  codexChatIdentity,
  configuredBootstrap,
  ControlledRuntime,
  nominalEvents,
  parseNdjson,
  postJson,
} from './testing/codex-chat-test-support.js'
import { withTestServer } from './testing/test-server.js'

test('Codex Chat exposes native acceptance and FIFO allowlisted events without changing text', async () => {
  const text = '  원문을 그대로 보내줘  '
  const runtime = new DeterministicCodexChatRuntime({
    threadIds: ['thread-A', 'thread-B'],
    turns: [
      {
        input: { threadId: 'thread-A', text },
        turnId: 'turn-A1',
        events: nominalEvents('thread-A', 'turn-A1'),
      },
    ],
  })

  await withTestServer(
    { codexChat: configuredBootstrap(runtime) },
    async (baseUrl) => {
      const configuredResponse = await fetch(
        `${baseUrl}/api/codex-chat/status`,
      )

      assert.deepEqual(await configuredResponse.json(), {
        state: 'configured',
        approvalMode: 'deny_all',
        sandbox: 'read_only',
        ...codexChatIdentity,
      })

      const threadResponse = await postJson(
        `${baseUrl}/api/codex-chat/threads`,
        {},
      )

      assert.equal(threadResponse.status, 201)
      assert.deepEqual(await threadResponse.json(), { threadId: 'thread-A' })

      const readyResponse = await fetch(`${baseUrl}/api/codex-chat/status`)

      assert.deepEqual(await readyResponse.json(), {
        state: 'ready',
        approvalMode: 'deny_all',
        sandbox: 'read_only',
        ...codexChatIdentity,
      })

      const turnResponse = await postJson(
        `${baseUrl}/api/codex-chat/threads/thread-A/turns`,
        { text },
      )
      const frames = parseNdjson(await turnResponse.text())

      assert.equal(turnResponse.status, 200)
      assert.match(
        turnResponse.headers.get('content-type') ?? '',
        /^application\/x-ndjson(?:;|$)/,
      )
      assert.deepEqual(frames, [
        {
          type: 'turn.accepted',
          threadId: 'thread-A',
          turnId: 'turn-A1',
        },
        ...nominalEvents('thread-A', 'turn-A1'),
      ])
      assert.deepEqual(runtime.calls.slice(0, 2), [
        { operation: 'startThread' },
        {
          operation: 'startTurn',
          input: { threadId: 'thread-A', text },
        },
      ])

      const replacementResponse = await postJson(
        `${baseUrl}/api/codex-chat/threads`,
        {},
      )

      assert.equal(replacementResponse.status, 201)
      assert.deepEqual(await replacementResponse.json(), {
        threadId: 'thread-B',
      })
      assert.deepEqual(runtime.calls.slice(2), [
        {
          operation: 'releaseThread',
          input: { threadId: 'thread-A' },
        },
        { operation: 'startThread' },
      ])
    },
  )
})

test('Codex Chat validates the exact browser contract before calling the runtime', async () => {
  const exactLimit = 'a'.repeat(131_072)
  const exactUnicodeLimit = '😀'.repeat(32_768)
  const escapedEnvelope = '\\'.repeat(131_072)
  const runtime = new DeterministicCodexChatRuntime({
    threadIds: ['thread-A'],
    turns: [
      {
        input: { threadId: 'thread-A', text: exactUnicodeLimit },
        turnId: 'turn-A2',
        events: [
          {
            type: 'turn.completed',
            threadId: 'thread-A',
            turnId: 'turn-A2',
            status: 'completed',
          },
        ],
      },
      {
        input: { threadId: 'thread-A', text: escapedEnvelope },
        turnId: 'turn-A3',
        events: [
          {
            type: 'turn.completed',
            threadId: 'thread-A',
            turnId: 'turn-A3',
            status: 'completed',
          },
        ],
      },
      {
        input: { threadId: 'thread-A', text: exactLimit },
        turnId: 'turn-A1',
        events: [
          {
            type: 'turn.completed',
            threadId: 'thread-A',
            turnId: 'turn-A1',
            status: 'completed',
          },
        ],
      },
    ],
  })

  await withTestServer(
    {
      codexChat: configuredBootstrap(runtime, {
        origin: 'http://127.0.0.1:4173',
      }),
    },
    async (baseUrl) => {
      const forbiddenOrigin = await postJson(
        `${baseUrl}/api/codex-chat/threads`,
        {},
        { origin: 'https://example.com' },
      )
      assert.equal(forbiddenOrigin.status, 403)

      const preflight = await fetch(`${baseUrl}/api/codex-chat/threads`, {
        method: 'OPTIONS',
        headers: {
          origin: 'http://127.0.0.1:4173',
          'access-control-request-method': 'POST',
        },
      })
      assert.equal(preflight.status, 204)
      assert.equal(
        preflight.headers.get('access-control-allow-origin'),
        'http://127.0.0.1:4173',
      )

      const overrideResponse = await postJson(
        `${baseUrl}/api/codex-chat/threads`,
        { cwd: '/tmp', approvalMode: 'accept' },
      )
      assert.equal(overrideResponse.status, 400)

      const threadResponse = await postJson(
        `${baseUrl}/api/codex-chat/threads`,
        {},
        {
          origin: 'http://127.0.0.1:4173',
          'x-forwarded-for': '203.0.113.8',
        },
      )
      assert.equal(threadResponse.status, 201)

      for (const body of [
        {},
        { text: '   ' },
        { text: 'ok', cwd: '/tmp' },
        { text: 'a'.repeat(131_073) },
        { text: '😀'.repeat(32_769) },
      ]) {
        const response = await postJson(
          `${baseUrl}/api/codex-chat/threads/thread-A/turns`,
          body,
        )
        assert.equal(response.status, 400)
      }

      for (const text of [exactUnicodeLimit, escapedEnvelope, exactLimit]) {
        const accepted = await postJson(
          `${baseUrl}/api/codex-chat/threads/thread-A/turns`,
          { text },
        )
        assert.equal(accepted.status, 200)
        await accepted.text()
      }

      assert.deepEqual(
        runtime.calls.filter((call) => call.operation === 'startTurn'),
        [exactUnicodeLimit, escapedEnvelope, exactLimit].map((text) => ({
          operation: 'startTurn',
          input: { threadId: 'thread-A', text },
        })),
      )
    },
  )
})

test('Codex Chat rejects malformed bodies, unknown native identities, and unconfigured Origins', async () => {
  const runtime = new ControlledRuntime()
  await withTestServer(
    { codexChat: configuredBootstrap(runtime) },
    async (baseUrl) => {
      const originResponse = await postJson(
        `${baseUrl}/api/codex-chat/threads`,
        {},
        { origin: 'http://localhost:4173' },
      )
      assert.equal(originResponse.status, 403)

      const malformedResponse = await fetch(
        `${baseUrl}/api/codex-chat/threads`,
        {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: '{',
        },
      )
      assert.equal(malformedResponse.status, 400)

      const wrongContentType = await fetch(
        `${baseUrl}/api/codex-chat/threads`,
        {
          method: 'POST',
          headers: { 'content-type': 'text/plain' },
          body: '{}',
        },
      )
      assert.equal(wrongContentType.status, 400)

      assert.equal(
        (
          await postJson(
            `${baseUrl}/api/codex-chat/threads/unknown/turns`,
            { text: 'no remap' },
          )
        ).status,
        404,
      )
      assert.equal(
        (
          await postJson(
            `${baseUrl}/api/codex-chat/threads/unknown/turns/unknown/interrupt`,
            {},
          )
        ).status,
        404,
      )
      assert.equal(runtime.startThreadCalls, 0)
    },
  )

  for (const address of [
    '127.0.0.1',
    '127.255.1.2',
    '::1',
    '::ffff:127.0.0.1',
  ]) {
    assert.equal(isLoopbackAddress(address), true)
  }
  for (const address of ['126.255.255.255', '128.0.0.1', '::2', undefined]) {
    assert.equal(isLoopbackAddress(address), false)
  }
})
