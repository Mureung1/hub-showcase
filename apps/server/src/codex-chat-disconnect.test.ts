import assert from 'node:assert/strict'
import test from 'node:test'

import { CodexChatRuntimeError } from '@ay-ple/codex-chat-runtime'

import {
  abortablePost,
  codexChatIdentity,
  connectWithoutReuse,
  configuredBootstrap,
  ControlledRuntime,
  createDeferred,
  postJson,
  postUntilFirstLine,
  settlesBeforeImmediate,
  waitFor,
} from './testing/codex-chat-test-support.js'
import { withTestServer } from './testing/test-server.js'

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
    {
      codexChat: configuredBootstrap(runtime, { disconnectDrainMs: 20 }),
    },
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
  const closeStarted = createDeferred<void>()
  const releaseClose = createDeferred<void>()
  const runtime = new (class extends ControlledRuntime {
    override async close(): Promise<void> {
      closeStarted.resolve()
      await releaseClose.promise
      await super.close()
    }
  })()
  await withTestServer(
    { codexChat: configuredBootstrap(runtime) },
    async (baseUrl, application) => {
      await postJson(`${baseUrl}/api/codex-chat/threads`, {})
      const firstClose = application.close()
      const secondClose = application.close()
      await closeStarted.promise

      try {
        await assert.rejects(connectWithoutReuse(baseUrl))
        assert.equal(await settlesBeforeImmediate(firstClose), false)
      } finally {
        releaseClose.resolve()
      }

      await Promise.all([firstClose, secondClose])
      assert.equal(runtime.closeCalls, 1)
      await assert.rejects(
        application.listen(0, '127.0.0.1'),
        /Server application is closing/,
      )

      await assert.rejects(fetch(`${baseUrl}/api/codex-chat/status`))
    },
  )

  let factoryCalls = 0
  await withTestServer(
    {
      codexChat: {
        ...codexChatIdentity,
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
