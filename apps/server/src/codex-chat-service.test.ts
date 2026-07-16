import assert from 'node:assert/strict'
import test from 'node:test'

import { CodexChatRuntimeError } from '@ay-ple/codex-chat-runtime'

import { CodexChatService } from './codex-chat-service.js'
import {
  codexChatIdentity,
  ControlledRuntime,
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
