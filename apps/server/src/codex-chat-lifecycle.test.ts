import assert from 'node:assert/strict'
import test from 'node:test'

import { CodexChatRuntimeError } from '@ay-ple/codex-chat-runtime'

import {
  codexChatIdentity,
  configuredBootstrap,
  ControlledRuntime,
  parseNdjson,
  postJson,
} from './testing/codex-chat-test-support.js'
import { withTestServer } from './testing/test-server.js'

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
      await runtime.turnDispatched

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
          ...codexChatIdentity,
          failureCode: 'runtime_stream_failed',
        },
      )
    },
  )
})
