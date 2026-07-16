import assert from 'node:assert/strict'
import { EventEmitter } from 'node:events'
import { mkdir, mkdtemp, rm } from 'node:fs/promises'
import { request as httpRequest, type IncomingMessage } from 'node:http'
import { tmpdir } from 'node:os'
import path from 'node:path'
import test from 'node:test'

import {
  CodexChatRuntimeError,
  type CodexChatEvent,
  type CodexChatRuntime,
  type CodexChatTurn,
} from '@ay-ple/codex-chat-runtime'
import { DeterministicCodexChatRuntime } from '@ay-ple/codex-chat-runtime/testing'

import type { CodexChatBootstrap } from './codex-chat.js'
import { isLoopbackAddress, writeNdjsonLine } from './codex-chat.js'
import { withTestServer } from './testing/test-server.js'

const identity = {
  sourceCommit: '8c68d4c87dc54d38861f5114e920c3de2efa5876',
  runtimeVersion: '0.144.4',
} as const

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
        ...identity,
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
        ...identity,
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
      codexChat: configuredBootstrap(runtime, 'http://127.0.0.1:4173'),
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

test('Codex Chat keeps a stream authoritative across conflict and interrupt', async () => {
  const runtime = new ControlledRuntime()

  await withTestServer(
    { codexChat: configuredBootstrap(runtime) },
    async (baseUrl) => {
      assert.equal(
        (await postJson(`${baseUrl}/api/codex-chat/threads`, {})).status,
        201,
      )

      const turnResponsePromise = postJson(
        `${baseUrl}/api/codex-chat/threads/thread-A/turns`,
        { text: 'wait for terminal' },
      )
      await runtime.turnStarted

      const conflictResponse = await postJson(
        `${baseUrl}/api/codex-chat/threads`,
        {},
      )
      assert.equal(conflictResponse.status, 409)
      assert.deepEqual(await conflictResponse.json(), {
        code: 'active_turn',
        displayMessage: 'A Codex turn is already active.',
      })
      assert.equal(
        (
          await postJson(
            `${baseUrl}/api/codex-chat/threads/thread-A/turns`,
            { text: 'do not dispatch a second turn' },
          )
        ).status,
        409,
      )

      const interruptResponse = await postJson(
        `${baseUrl}/api/codex-chat/threads/thread-A/turns/turn-A1/interrupt`,
        {},
      )
      assert.equal(interruptResponse.status, 202)
      assert.equal(runtime.interruptCalls, 1)

      runtime.emit({
        type: 'turn.completed',
        threadId: 'thread-A',
        turnId: 'turn-A1',
        status: 'interrupted',
      })

      const turnResponse = await turnResponsePromise
      const frames = parseNdjson(await turnResponse.text())
      assert.deepEqual(frames.at(-1), {
        type: 'turn.completed',
        threadId: 'thread-A',
        turnId: 'turn-A1',
        status: 'interrupted',
      })
      assert.equal(
        (
          await postJson(
            `${baseUrl}/api/codex-chat/threads/thread-A/turns/turn-A1/interrupt`,
            {},
          )
        ).status,
        404,
      )
    },
  )
})

test('Codex Chat keeps the authoritative stream alive after a nonfatal interrupt rejection', async () => {
  const runtime = new ControlledRuntime({
    interruptError: new CodexChatRuntimeError({
      code: 'sdk_request_failed',
      displayMessage: 'Codex rejected the requested operation.',
      unknownOutcome: false,
    }),
  })
  await withTestServer(
    { codexChat: configuredBootstrap(runtime) },
    async (baseUrl) => {
      await postJson(`${baseUrl}/api/codex-chat/threads`, {})
      const streamPromise = postJson(
        `${baseUrl}/api/codex-chat/threads/thread-A/turns`,
        { text: 'keep streaming' },
      )
      await runtime.turnDispatched

      const interruptResponse = await postJson(
        `${baseUrl}/api/codex-chat/threads/thread-A/turns/turn-A1/interrupt`,
        {},
      )
      assert.equal(interruptResponse.status, 502)
      runtime.emit({
        type: 'turn.completed',
        threadId: 'thread-A',
        turnId: 'turn-A1',
        status: 'completed',
      })

      const frames = parseNdjson(await (await streamPromise).text())
      assert.equal(frames.at(-1)?.type, 'turn.completed')
      assert.equal(runtime.closeCalls, 0)
    },
  )
})

test('Codex Chat maps pre-acceptance runtime errors without committing NDJSON', async () => {
  const runtime = new ControlledRuntime({
    startTurnError: new CodexChatRuntimeError({
      code: 'runtime_response_timeout',
      displayMessage: 'The Codex runtime did not respond before its deadline.',
      unknownOutcome: true,
    }),
  })

  await withTestServer(
    { codexChat: configuredBootstrap(runtime) },
    async (baseUrl) => {
      await postJson(`${baseUrl}/api/codex-chat/threads`, {})
      const response = await postJson(
        `${baseUrl}/api/codex-chat/threads/thread-A/turns`,
        { text: 'timeout' },
      )

      assert.equal(response.status, 504)
      assert.match(response.headers.get('content-type') ?? '', /^application\/json/)
      assert.deepEqual(await response.json(), {
        code: 'runtime_response_timeout',
        displayMessage: 'The Codex runtime did not respond before its deadline.',
        unknownOutcome: true,
      })
      assert.equal(runtime.closeCalls, 1)
    },
  )
})

test('Codex Chat maps a known thread rejection without failing or retrying the runtime', async () => {
  const runtime = new ControlledRuntime({
    startThreadError: new CodexChatRuntimeError({
      code: 'sdk_request_failed',
      displayMessage: 'Codex rejected the requested operation.',
      unknownOutcome: false,
    }),
  })
  await withTestServer(
    { codexChat: configuredBootstrap(runtime) },
    async (baseUrl) => {
      const response = await postJson(`${baseUrl}/api/codex-chat/threads`, {})

      assert.equal(response.status, 502)
      assert.deepEqual(await response.json(), {
        code: 'sdk_request_failed',
        displayMessage: 'Codex rejected the requested operation.',
        unknownOutcome: false,
      })
      assert.equal(runtime.startThreadCalls, 1)
      assert.equal(runtime.closeCalls, 0)
      assert.equal(
        (await (await fetch(`${baseUrl}/api/codex-chat/status`)).json()).state,
        'ready',
      )
    },
  )
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
        ...identity,
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
        ...identity,
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
          ...identity,
        },
      )

      factoryResult.resolve(runtime)
      assert.equal((await threadPromise).status, 201)
    },
  )

  await withTestServer(
    {
      codexChat: {
        ...identity,
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
          ...identity,
          failureCode: 'runtime_start_failed',
        },
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

test('Codex Chat waits for native turn acceptance before committing HTTP headers', async () => {
  const runtime = new ControlledRuntime({ holdStartTurn: true })
  await withTestServer(
    { codexChat: configuredBootstrap(runtime) },
    async (baseUrl) => {
      await postJson(`${baseUrl}/api/codex-chat/threads`, {})
      let responseSettled = false
      const responsePromise = postJson(
        `${baseUrl}/api/codex-chat/threads/thread-A/turns`,
        { text: 'accept me first' },
      ).then((response) => {
        responseSettled = true
        return response
      })

      await runtime.turnDispatched
      await new Promise((resolve) => setImmediate(resolve))
      assert.equal(responseSettled, false)

      runtime.resolveStartTurn()
      runtime.emit({
        type: 'turn.completed',
        threadId: 'thread-A',
        turnId: 'turn-A1',
        status: 'completed',
      })
      const response = await responsePromise
      assert.equal(response.status, 200)
      assert.equal(parseNdjson(await response.text())[0]?.type, 'turn.accepted')
    },
  )
})

test('Codex Chat converts an accepted stream failure into one final safe runtime frame', async () => {
  const runtime = new ControlledRuntime()
  await withTestServer(
    { codexChat: configuredBootstrap(runtime) },
    async (baseUrl) => {
      await postJson(`${baseUrl}/api/codex-chat/threads`, {})
      const responsePromise = postJson(
        `${baseUrl}/api/codex-chat/threads/thread-A/turns`,
        { text: 'fail after acceptance' },
      )
      await runtime.turnDispatched
      runtime.emit({
        type: 'agent_message.delta',
        threadId: 'thread-A',
        turnId: 'turn-A1',
        itemId: 'item-A1',
        delta: 'partial',
      })
      runtime.failStream(new Error('/secret/provider-detail'))

      const response = await responsePromise
      const frames = parseNdjson(await response.text())
      assert.deepEqual(frames.map((frame) => frame.type), [
        'turn.accepted',
        'agent_message.delta',
        'runtime.failed',
      ])
      assert.deepEqual(frames.at(-1), {
        type: 'runtime.failed',
        code: 'runtime_stream_failed',
        displayMessage: 'The Codex Chat stream failed.',
        mutationOutcomeKnown: true,
      })
      assert.equal(runtime.closeCalls, 1)
      assert.deepEqual(
        await (await fetch(`${baseUrl}/api/codex-chat/status`)).json(),
        {
          state: 'failed',
          approvalMode: 'deny_all',
          sandbox: 'read_only',
          ...identity,
          failureCode: 'runtime_stream_failed',
        },
      )
    },
  )
})

test('Codex Chat interrupts and drains a turn whose browser disconnects before acceptance', async () => {
  const runtime = new ControlledRuntime({ holdStartTurn: true })
  await withTestServer(
    { codexChat: configuredBootstrap(runtime) },
    async (baseUrl) => {
      await postJson(`${baseUrl}/api/codex-chat/threads`, {})
      const request = abortablePost(
        `${baseUrl}/api/codex-chat/threads/thread-A/turns`,
        { text: 'disconnect while pending' },
      )
      await runtime.turnDispatched
      request.destroy()
      await request.closed

      runtime.resolveStartTurn()
      await waitFor(() => runtime.interruptCalls === 1)
      runtime.emit({
        type: 'turn.completed',
        threadId: 'thread-A',
        turnId: 'turn-A1',
        status: 'interrupted',
      })
      await waitFor(() => runtime.terminalEventsPulled === 1)
      assert.equal(runtime.closeCalls, 0)
    },
  )
})

test('Codex Chat releases a late thread response after the browser disconnects', async () => {
  const runtime = new ControlledRuntime({ holdStartThread: true })
  await withTestServer(
    { codexChat: configuredBootstrap(runtime) },
    async (baseUrl) => {
      const request = abortablePost(`${baseUrl}/api/codex-chat/threads`, {})
      await runtime.threadStartDispatched
      request.destroy()
      await request.closed
      await new Promise((resolve) => setTimeout(resolve, 20))

      runtime.resolveStartThread()
      await waitFor(() => runtime.releaseThreadCalls === 1)
      assert.equal(runtime.closeCalls, 0)
    },
  )
})

test('Codex Chat closes an unknown-outcome thread mutation after browser disconnect', async () => {
  const runtime = new ControlledRuntime({
    holdStartThread: true,
    startThreadError: new CodexChatRuntimeError({
      code: 'runtime_response_timeout',
      displayMessage: 'The Codex runtime did not respond before its deadline.',
      unknownOutcome: true,
    }),
  })
  await withTestServer(
    { codexChat: configuredBootstrap(runtime) },
    async (baseUrl) => {
      const request = abortablePost(`${baseUrl}/api/codex-chat/threads`, {})
      await runtime.threadStartDispatched
      request.destroy()
      await request.closed

      runtime.resolveStartThread()
      await waitFor(() => runtime.closeCalls === 1)
      assert.equal(runtime.releaseThreadCalls, 0)
    },
  )
})

test('Codex Chat interrupts and drains after an accepted stream disconnects', async () => {
  const runtime = new ControlledRuntime()
  await withTestServer(
    { codexChat: configuredBootstrap(runtime) },
    async (baseUrl) => {
      await postJson(`${baseUrl}/api/codex-chat/threads`, {})
      const stream = postUntilFirstLine(
        `${baseUrl}/api/codex-chat/threads/thread-A/turns`,
        { text: 'disconnect after acceptance' },
      )
      assert.match(await stream.firstLine, /"type":"turn.accepted"/)
      stream.destroy()
      await stream.closed
      await waitFor(() => runtime.interruptCalls === 1)

      runtime.emit({
        type: 'turn.completed',
        threadId: 'thread-A',
        turnId: 'turn-A1',
        status: 'interrupted',
      })
      await waitFor(() => runtime.terminalEventsPulled === 1)
      assert.equal(runtime.closeCalls, 0)
    },
  )
})

test('Codex Chat closes the shared runtime when disconnect drain exceeds its bound', async () => {
  const runtime = new ControlledRuntime()
  await withTestServer(
    { codexChat: configuredBootstrap(runtime, undefined, 20) },
    async (baseUrl) => {
      await postJson(`${baseUrl}/api/codex-chat/threads`, {})
      const stream = postUntilFirstLine(
        `${baseUrl}/api/codex-chat/threads/thread-A/turns`,
        { text: 'never reaches terminal' },
      )
      await stream.firstLine
      stream.destroy()
      await stream.closed

      await waitFor(() => runtime.closeCalls === 1)
    },
  )
})

test('Codex Chat shutdown blocks new work and closes an initialized runtime once', async () => {
  const runtime = new ControlledRuntime()
  await withTestServer(
    { codexChat: configuredBootstrap(runtime) },
    async (baseUrl, application) => {
      await postJson(`${baseUrl}/api/codex-chat/threads`, {})
      await Promise.all([application.close(), application.close()])
      assert.equal(runtime.closeCalls, 1)

      await assert.rejects(fetch(`${baseUrl}/api/codex-chat/status`))
    },
  )

  let factoryCalls = 0
  await withTestServer(
    {
      codexChat: {
        ...identity,
        createRuntime: async () => {
          factoryCalls += 1
          return new ControlledRuntime()
        },
      },
    },
    async (_baseUrl, application) => {
      await application.close()
      assert.equal(factoryCalls, 0)
    },
  )
})

test('Codex Chat NDJSON writer waits for drain and stops on close', async () => {
  const response = new BackpressuredResponse()
  const writePromise = writeNdjsonLine(response, {
    type: 'turn.accepted',
    threadId: 'thread-A',
    turnId: 'turn-A1',
  })
  let settled = false
  void writePromise.then(() => {
    settled = true
  })

  await new Promise((resolve) => setImmediate(resolve))
  assert.equal(settled, false)
  response.emit('drain')
  assert.equal(await writePromise, true)

  const closedResponse = new BackpressuredResponse()
  const closedWrite = writeNdjsonLine(closedResponse, {
    type: 'turn.accepted',
    threadId: 'thread-A',
    turnId: 'turn-A1',
  })
  closedResponse.emit('close')
  assert.equal(await closedWrite, false)
})

function configuredBootstrap(
  runtime: CodexChatRuntime,
  origin?: string,
  disconnectDrainMs?: number,
): CodexChatBootstrap {
  return {
    ...identity,
    origin,
    disconnectDrainMs,
    createRuntime: async () => runtime,
  }
}

function nominalEvents(
  threadId: string,
  turnId: string,
): readonly CodexChatEvent[] {
  return [
    {
      type: 'agent_message.delta',
      threadId,
      turnId,
      itemId: 'item-A1',
      delta: '안녕',
    },
    {
      type: 'agent_message.completed',
      threadId,
      turnId,
      itemId: 'item-A1',
      text: '안녕하세요',
    },
    {
      type: 'turn.completed',
      threadId,
      turnId,
      status: 'completed',
    },
  ]
}

async function postJson(
  url: string,
  body: unknown,
  headers: Record<string, string> = {},
): Promise<Response> {
  return fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...headers },
    body: JSON.stringify(body),
  })
}

function parseNdjson(encoded: string): Array<Record<string, unknown>> {
  return encoded
    .trim()
    .split('\n')
    .filter(Boolean)
    .map((line) => JSON.parse(line) as Record<string, unknown>)
}

type Deferred<T> = {
  promise: Promise<T>
  resolve(value?: T): void
}

function createDeferred<T>(): Deferred<T> {
  let resolve!: (value?: T) => void
  const promise = new Promise<T>((settle) => {
    resolve = (value) => settle(value as T)
  })
  return { promise, resolve }
}

class ControlledRuntime implements CodexChatRuntime {
  private readonly eventQueue: Array<
    | { readonly type: 'event'; readonly event: CodexChatEvent }
    | { readonly type: 'error'; readonly error: Error }
  > = []
  private readonly eventWaiters: Array<
    Deferred<
      | { readonly type: 'event'; readonly event: CodexChatEvent }
      | { readonly type: 'error'; readonly error: Error }
    >
  > = []
  private readonly dispatched = createDeferred<void>()
  private readonly threadDispatched = createDeferred<void>()
  private readonly startThreadGate?: Deferred<void>
  private readonly startTurnGate?: Deferred<void>
  private readonly startThreadError?: Error
  private readonly startTurnError?: Error
  private readonly interruptError?: Error
  startThreadCalls = 0
  releaseThreadCalls = 0
  interruptCalls = 0
  closeCalls = 0
  terminalEventsPulled = 0

  constructor(
    options: {
      holdStartThread?: boolean
      holdStartTurn?: boolean
      interruptError?: Error
      startThreadError?: Error
      startTurnError?: Error
    } = {},
  ) {
    this.startThreadError = options.startThreadError
    this.startTurnError = options.startTurnError
    this.interruptError = options.interruptError
    if (options.holdStartThread) this.startThreadGate = createDeferred<void>()
    if (options.holdStartTurn) this.startTurnGate = createDeferred<void>()
  }

  get turnStarted(): Promise<void> {
    return this.dispatched.promise
  }

  get turnDispatched(): Promise<void> {
    return this.dispatched.promise
  }

  get threadStartDispatched(): Promise<void> {
    return this.threadDispatched.promise
  }

  resolveStartThread(): void {
    this.startThreadGate?.resolve()
  }

  resolveStartTurn(): void {
    this.startTurnGate?.resolve()
  }

  async startThread(): Promise<{ threadId: string }> {
    this.startThreadCalls += 1
    this.threadDispatched.resolve()
    await this.startThreadGate?.promise
    if (this.startThreadError) throw this.startThreadError
    return { threadId: 'thread-A' }
  }

  async startTurn(): Promise<CodexChatTurn> {
    this.dispatched.resolve()
    await this.startTurnGate?.promise
    if (this.startTurnError) throw this.startTurnError
    return {
      threadId: 'thread-A',
      turnId: 'turn-A1',
      events: this.events(),
    }
  }

  async interrupt(): Promise<void> {
    this.interruptCalls += 1
    if (this.interruptError) throw this.interruptError
  }

  async releaseThread(): Promise<void> {
    this.releaseThreadCalls += 1
  }

  async close(): Promise<void> {
    this.closeCalls += 1
    this.enqueue({
      type: 'event',
      event: {
        type: 'runtime.failed',
        code: 'runtime_closed',
        displayMessage: 'The test runtime closed.',
        mutationOutcomeKnown: true,
      },
    })
  }

  emit(event: CodexChatEvent): void {
    this.enqueue({ type: 'event', event })
  }

  failStream(error: Error): void {
    this.enqueue({ type: 'error', error })
  }

  private async *events(): AsyncGenerator<CodexChatEvent> {
    while (true) {
      const entry = await this.nextEvent()
      if (entry.type === 'error') throw entry.error
      const event = entry.event
      if (event.type === 'turn.completed' || event.type === 'runtime.failed') {
        this.terminalEventsPulled += 1
      }
      yield event
      if (event.type === 'turn.completed' || event.type === 'runtime.failed') {
        return
      }
    }
  }

  private enqueue(entry: (typeof this.eventQueue)[number]): void {
    const waiter = this.eventWaiters.shift()
    if (waiter) {
      waiter.resolve(entry)
      return
    }
    this.eventQueue.push(entry)
  }

  private nextEvent(): Promise<(typeof this.eventQueue)[number]> {
    const entry = this.eventQueue.shift()
    if (entry) return Promise.resolve(entry)
    const waiter = createDeferred<(typeof this.eventQueue)[number]>()
    this.eventWaiters.push(waiter)
    return waiter.promise
  }
}

class BackpressuredResponse extends EventEmitter {
  readonly destroyed = false
  readonly writableEnded = false

  write(_chunk: string): boolean {
    return false
  }
}

function abortablePost(
  url: string,
  body: unknown,
): { readonly closed: Promise<void>; destroy(): void } {
  const target = new URL(url)
  const closed = createDeferred<void>()
  let socket: import('node:net').Socket | undefined
  const request = httpRequest({
    hostname: target.hostname,
    port: target.port,
    path: target.pathname,
    method: 'POST',
    headers: { 'content-type': 'application/json' },
  })
  request.on('error', () => undefined)
  request.on('socket', (assigned) => {
    socket = assigned
    assigned.once('close', () => closed.resolve())
  })
  request.end(JSON.stringify(body))
  return {
    closed: closed.promise,
    destroy: () => (socket ? socket.destroy() : request.destroy()),
  }
}

function postUntilFirstLine(
  url: string,
  body: unknown,
): {
  readonly firstLine: Promise<string>
  readonly closed: Promise<void>
  destroy(): void
} {
  const target = new URL(url)
  const firstLine = createDeferred<string>()
  const closed = createDeferred<void>()
  let response: IncomingMessage | undefined
  let encoded = ''
  const request = httpRequest({
    hostname: target.hostname,
    port: target.port,
    path: target.pathname,
    method: 'POST',
    headers: { 'content-type': 'application/json' },
  })
  request.on('error', () => undefined)
  request.on('response', (incoming) => {
    response = incoming
    incoming.setEncoding('utf8')
    incoming.on('data', (chunk: string) => {
      encoded += chunk
      const newline = encoded.indexOf('\n')
      if (newline >= 0) firstLine.resolve(encoded.slice(0, newline))
    })
    incoming.once('close', () => closed.resolve())
  })
  request.end(JSON.stringify(body))
  return {
    firstLine: firstLine.promise,
    closed: closed.promise,
    destroy() {
      if (response) response.destroy()
      else request.destroy()
    },
  }
}

async function waitFor(
  predicate: () => boolean,
  timeoutMs = 1_000,
): Promise<void> {
  const deadline = Date.now() + timeoutMs
  while (!predicate()) {
    if (Date.now() >= deadline) throw new Error('Timed out waiting for test state')
    await new Promise((resolve) => setTimeout(resolve, 5))
  }
}
