import assert from 'node:assert/strict'
import test from 'node:test'

import { CodexChatRuntimeError } from '@ay-ple/codex-chat-runtime'

import { CodexChatService } from './codex-chat-service.js'
import { writeNdjsonLine } from './codex-chat.js'
import {
  BackpressuredResponse,
  codexChatIdentity,
  ControlledRuntime,
  settlesBeforeImmediate,
  waitFor,
} from './testing/codex-chat-test-support.js'

test('Codex Chat cancels a disconnected turn before native dispatch and releases its reservation', async () => {
  const runtime = new ControlledRuntime()
  const service = createService(runtime)
  const thread = await service.startThread(() => false)
  assert.deepEqual(thread, { threadId: 'thread-A' })

  assert.equal(
    await service.startTurn('thread-A', 'unseen', () => true),
    undefined,
  )
  assert.equal(runtime.startTurnCalls, 0)
  assert.equal(runtime.interruptCalls, 0)

  const visibleTurn = await service.startTurn('thread-A', 'visible', () => false)
  assert.ok(visibleTurn)
  runtime.emit({
    type: 'turn.completed',
    threadId: 'thread-A',
    turnId: 'turn-A1',
    status: 'completed',
  })
  await service.streamTurn(visibleTurn, undefined)
  assert.equal(runtime.startTurnCalls, 1)
  await service.close()
})

test('Codex Chat exposes autonomous runtime cleanup failures as a stable failed status', async (t) => {
  await t.test('post-acceptance stream failure', async () => {
    const runtime = cleanupFailingRuntime()
    const service = createService(runtime)
    await service.startThread(() => false)
    const turn = await service.startTurn('thread-A', 'fail', () => false)
    assert.ok(turn)
    runtime.failStream(new Error('/private/provider/error'))

    await service.streamTurn(turn, undefined)

    await assertCleanupFailed(service, runtime)
  })

  await t.test('authoritative runtime.failed terminal', async () => {
    const runtime = cleanupFailingRuntime()
    const service = createService(runtime)
    await service.startThread(() => false)
    const turn = await service.startTurn('thread-A', 'fail', () => false)
    assert.ok(turn)
    runtime.emit({
      type: 'runtime.failed',
      code: 'bridge_failed',
      displayMessage: 'The Codex runtime failed.',
      mutationOutcomeKnown: true,
    })

    await service.streamTurn(turn, undefined)

    await assertCleanupFailed(service, runtime)
  })

  await t.test('unknown mutation outcome', async () => {
    const runtime = new ControlledRuntime({
      closeError: new Error('child could not be reaped'),
      startTurnError: new CodexChatRuntimeError({
        code: 'runtime_response_timeout',
        displayMessage: 'The Codex runtime did not respond before its deadline.',
        unknownOutcome: true,
      }),
    })
    const service = createService(runtime)
    await service.startThread(() => false)

    await assert.rejects(service.startTurn('thread-A', 'unknown', () => false))

    await assertCleanupFailed(service, runtime)
  })

  await t.test('disconnect drain timeout', async () => {
    const runtime = cleanupFailingRuntime()
    const service = createService(runtime, 5)
    await service.startThread(() => false)
    const turn = await service.startTurn('thread-A', 'abandoned', () => false)
    assert.ok(turn)

    service.disconnectTurn('thread-A')
    await waitFor(() => runtime.closeCalls === 1)

    await assertCleanupFailed(service, runtime)
  })
})

test('Codex Chat observes an idle runtime terminal and closes it once', async () => {
  const runtime = new ControlledRuntime()
  const service = createService(runtime)
  await service.startThread(() => false)
  assert.equal((await service.status()).state, 'ready')

  runtime.failRuntime(
    new CodexChatRuntimeError({
      code: 'runtime_lost',
      displayMessage: 'The Codex runtime connection was lost.',
      unknownOutcome: false,
    }),
  )
  await waitFor(() => runtime.closeCalls === 1)

  assert.deepEqual(await service.status(), {
    state: 'failed',
    approvalMode: 'deny_all',
    sandbox: 'read_only',
    ...codexChatIdentity,
    failureCode: 'runtime_lost',
  })
  await assert.rejects(
    service.startThread(() => false),
    /codex_chat_unavailable/,
  )
  await service.close()
  assert.equal(runtime.closeCalls, 1)
})

test('Codex Chat elevates idle terminal cleanup failure without closing twice', async () => {
  const runtime = cleanupFailingRuntime()
  const service = createService(runtime)
  await service.startThread(() => false)

  runtime.failRuntime(
    new CodexChatRuntimeError({
      code: 'runtime_lost',
      displayMessage: 'The Codex runtime connection was lost.',
      unknownOutcome: false,
    }),
  )
  await waitFor(() => runtime.closeCalls === 1)

  await assertCleanupFailed(service, runtime)
})

test('Codex Chat drains after a response sink stalls and preserves a healthy runtime terminal', async () => {
  const runtime = new ControlledRuntime()
  const service = createService(runtime, 50)
  await service.startThread(() => false)
  const turn = await service.startTurn('thread-A', 'slow sink', () => false)
  assert.ok(turn)

  const streaming = service.streamTurn(turn, {
    accept: async () => false,
    write: async () => {
      throw new Error('A disconnected sink must not receive events')
    },
    end: () => undefined,
  })
  await waitFor(() => runtime.interruptCalls === 1)
  runtime.emit({
    type: 'turn.completed',
    threadId: 'thread-A',
    turnId: 'turn-A1',
    status: 'interrupted',
  })
  await streaming

  assert.equal(runtime.terminalEventsPulled, 1)
  assert.equal(runtime.closeCalls, 0)
  assert.equal((await service.status()).state, 'ready')

  const nextTurn = await service.startTurn(
    'thread-A',
    'lease was released',
    () => false,
  )
  assert.ok(nextTurn)
  runtime.emit({
    type: 'turn.completed',
    threadId: 'thread-A',
    turnId: 'turn-A1',
    status: 'completed',
  })
  await service.streamTurn(nextTurn, undefined)
  await service.close()
})

test('Codex Chat closes once when a stalled sink never reaches a native terminal', async () => {
  const runtime = new ControlledRuntime()
  const service = createService(runtime, 5)
  await service.startThread(() => false)
  const turn = await service.startTurn('thread-A', 'never terminal', () => false)
  assert.ok(turn)

  const streaming = service.streamTurn(turn, {
    accept: async () => false,
    write: async () => false,
    end: () => undefined,
  })
  await waitFor(() => runtime.closeCalls === 1)
  await streaming

  assert.equal(runtime.interruptCalls, 1)
  assert.equal(runtime.closeCalls, 1)
  assert.deepEqual(await service.status(), {
    state: 'failed',
    approvalMode: 'deny_all',
    sandbox: 'read_only',
    ...codexChatIdentity,
    failureCode: 'disconnect_drain_timeout',
  })
})

test('Codex Chat starts native drain only after the HTTP write deadline', async () => {
  const runtime = new ControlledRuntime()
  const response = new BackpressuredResponse()
  const nativeDrainMs = 40
  const service = createService(runtime, nativeDrainMs)
  await service.startThread(() => false)
  const turn = await service.startTurn('thread-A', 'slow writer', () => false)
  assert.ok(turn)

  const streaming = service.streamTurn(turn, {
    accept: (accepted) =>
      writeNdjsonLine(
        response,
        {
          type: 'turn.accepted',
          threadId: accepted.threadId,
          turnId: accepted.turnId,
        },
        10,
      ),
    write: (frame) => writeNdjsonLine(response, frame, 10),
    end: () => undefined,
  })

  await waitFor(() => runtime.interruptCalls === 1)
  const nativeDrainStartedAt = Date.now()
  assert.equal(response.destroyCalls, 1)
  assert.equal(runtime.closeCalls, 0)
  await new Promise((resolve) => setTimeout(resolve, nativeDrainMs / 2))
  assert.equal(runtime.closeCalls, 0)

  await waitFor(() => runtime.closeCalls === 1)
  assert.ok(Date.now() - nativeDrainStartedAt >= nativeDrainMs - 10)
  await streaming
})

test('Codex Chat coalesces active terminal and shutdown cleanup', async () => {
  const runtime = new ControlledRuntime()
  const service = createService(runtime)
  await service.startThread(() => false)
  const turn = await service.startTurn('thread-A', 'race shutdown', () => false)
  assert.ok(turn)
  const streaming = service.streamTurn(turn, undefined)

  runtime.failRuntime(
    new CodexChatRuntimeError({
      code: 'runtime_lost',
      displayMessage: 'The Codex runtime connection was lost.',
      unknownOutcome: false,
    }),
  )
  await Promise.all([streaming, service.close()])

  assert.equal(runtime.closeCalls, 1)
  assert.equal((await service.status()).state, 'failed')
})

test('Codex Chat keeps a normal runtime close out of the terminal signal', async () => {
  const runtime = new ControlledRuntime()
  const service = createService(runtime)
  await service.startThread(() => false)

  await service.close()

  assert.equal(await settlesBeforeImmediate(runtime.terminal), false)
  assert.equal(runtime.closeCalls, 1)
})

test('Codex Chat observes a cleanup failure that is the first runtime terminal', async () => {
  const runtime = cleanupFailingRuntime()
  const service = createService(runtime)
  await service.startThread(() => false)

  await assert.rejects(service.close(), /child could not be reaped/)

  assert.equal(await settlesBeforeImmediate(runtime.terminal), true)
  await new Promise((resolve) => setImmediate(resolve))
  assert.deepEqual(await service.status(), {
    state: 'failed',
    approvalMode: 'deny_all',
    sandbox: 'read_only',
    ...codexChatIdentity,
    failureCode: 'runtime_cleanup_failed',
  })
  assert.equal(runtime.closeCalls, 1)
})

function createService(
  runtime: ControlledRuntime,
  disconnectDrainMs = 5_000,
): CodexChatService {
  return new CodexChatService(
    {
      kind: 'prepared',
      prepared: {
        ...codexChatIdentity,
        createRuntime: async () => runtime,
      },
    },
    disconnectDrainMs,
  )
}

function cleanupFailingRuntime(): ControlledRuntime {
  return new ControlledRuntime({
    closeError: new Error('child could not be reaped'),
  })
}

async function assertCleanupFailed(
  service: CodexChatService,
  runtime: ControlledRuntime,
): Promise<void> {
  assert.equal(runtime.closeCalls, 1)
  assert.deepEqual(await service.status(), {
    state: 'failed',
    approvalMode: 'deny_all',
    sandbox: 'read_only',
    ...codexChatIdentity,
    failureCode: 'runtime_cleanup_failed',
  })
  await assert.rejects(service.close(), /child could not be reaped/)
  assert.equal(runtime.closeCalls, 1)
}
