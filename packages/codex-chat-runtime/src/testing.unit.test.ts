import assert from 'node:assert/strict'
import test from 'node:test'

import { DeterministicCodexChatRuntime } from './testing.js'

test('deterministic runtime returns caller-supplied native thread identities', async () => {
  const runtime = new DeterministicCodexChatRuntime({
    threadIds: ['thread-native-a', 'thread-native-b'],
  })

  assert.deepEqual(await runtime.startThread(), {
    threadId: 'thread-native-a',
  })
  assert.deepEqual(await runtime.startThread(), {
    threadId: 'thread-native-b',
  })
  assert.deepEqual(runtime.calls, [
    { operation: 'startThread' },
    { operation: 'startThread' },
  ])
})

test('deterministic runtime preserves native turn identity and event FIFO', async () => {
  const events = [
    {
      type: 'agent_message.delta' as const,
      threadId: 'thread-native',
      turnId: 'turn-native',
      itemId: 'item-native',
      delta: 'hel',
    },
    {
      type: 'agent_message.completed' as const,
      threadId: 'thread-native',
      turnId: 'turn-native',
      itemId: 'item-native',
      text: 'hello',
    },
    {
      type: 'turn.completed' as const,
      threadId: 'thread-native',
      turnId: 'turn-native',
      status: 'completed' as const,
    },
  ]
  const runtime = new DeterministicCodexChatRuntime({
    threadIds: ['thread-native'],
    turns: [
      {
        input: { threadId: 'thread-native', text: 'say hello' },
        turnId: 'turn-native',
        events,
      },
    ],
  })
  await runtime.startThread()

  const turn = await runtime.startTurn({
    threadId: 'thread-native',
    text: 'say hello',
  })
  const observed = []
  for await (const event of turn.events) observed.push(event)

  assert.equal(turn.threadId, 'thread-native')
  assert.equal(turn.turnId, 'turn-native')
  assert.deepEqual(observed, events)
  assert.deepEqual(runtime.calls, [
    { operation: 'startThread' },
    {
      operation: 'startTurn',
      input: { threadId: 'thread-native', text: 'say hello' },
    },
  ])
})

test('deterministic runtime supports interrupt, release, and idempotent close', async () => {
  const runtime = new DeterministicCodexChatRuntime({
    threadIds: ['thread-native', 'unused-thread'],
    turns: [
      {
        input: { threadId: 'thread-native', text: 'wait' },
        turnId: 'turn-native',
        events: [
          {
            type: 'turn.completed',
            threadId: 'thread-native',
            turnId: 'turn-native',
            status: 'interrupted',
          },
        ],
      },
    ],
  })
  await runtime.startThread()
  const turn = await runtime.startTurn({
    threadId: 'thread-native',
    text: 'wait',
  })

  await runtime.interrupt({
    threadId: 'thread-native',
    turnId: 'turn-native',
  })
  for await (const _event of turn.events) {
    // Exhaust the authoritative terminal before releasing the live thread.
  }
  await runtime.releaseThread({ threadId: 'thread-native' })
  await runtime.close()
  await runtime.close()

  assert.equal(await settlesBeforeImmediate(runtime.terminal), false)

  await assert.rejects(() => runtime.startThread(), /closed/)
  assert.deepEqual(runtime.calls, [
    { operation: 'startThread' },
    {
      operation: 'startTurn',
      input: { threadId: 'thread-native', text: 'wait' },
    },
    {
      operation: 'interrupt',
      input: { threadId: 'thread-native', turnId: 'turn-native' },
    },
    {
      operation: 'releaseThread',
      input: { threadId: 'thread-native' },
    },
    { operation: 'close' },
    { operation: 'close' },
    { operation: 'startThread' },
  ])
})

test('deterministic runtime rejects a scripted event with mismatched native scope', async () => {
  const runtime = new DeterministicCodexChatRuntime({
    threadIds: ['thread-native'],
    turns: [
      {
        input: { threadId: 'thread-native', text: 'hello' },
        turnId: 'turn-native',
        events: [
          {
            type: 'agent_message.delta',
            threadId: 'different-thread',
            turnId: 'turn-native',
            itemId: 'item-native',
            delta: 'hello',
          },
        ],
      },
    ],
  })
  await runtime.startThread()

  await assert.rejects(
    () =>
      runtime.startTurn({
        threadId: 'thread-native',
        text: 'hello',
      }),
    /event identity does not match/,
  )
})

test('deterministic runtime turn stream admits one consumer', async () => {
  const runtime = new DeterministicCodexChatRuntime({
    threadIds: ['thread-native'],
    turns: [
      {
        input: { threadId: 'thread-native', text: 'hello' },
        turnId: 'turn-native',
        events: [],
      },
    ],
  })
  await runtime.startThread()
  const turn = await runtime.startTurn({
    threadId: 'thread-native',
    text: 'hello',
  })

  turn.events[Symbol.asyncIterator]()
  assert.throws(
    () => turn.events[Symbol.asyncIterator](),
    /one consumer/,
  )
})

test('deterministic runtime preserves a rejected concurrent turn script', async () => {
  const runtime = new DeterministicCodexChatRuntime({
    threadIds: ['thread-native'],
    turns: [
      {
        input: { threadId: 'thread-native', text: 'first' },
        turnId: 'turn-first',
        events: [
          {
            type: 'turn.completed',
            threadId: 'thread-native',
            turnId: 'turn-first',
            status: 'completed',
          },
        ],
      },
      {
        input: { threadId: 'thread-native', text: 'second' },
        turnId: 'turn-second',
        events: [],
      },
    ],
  })
  await runtime.startThread()
  const first = await runtime.startTurn({
    threadId: 'thread-native',
    text: 'first',
  })

  await assert.rejects(
    () =>
      runtime.startTurn({
        threadId: 'thread-native',
        text: 'second',
      }),
    /active turn/,
  )
  for await (const _event of first.events) {
    // Exhaust the first authoritative terminal.
  }
  const second = await runtime.startTurn({
    threadId: 'thread-native',
    text: 'second',
  })

  assert.equal(second.turnId, 'turn-second')
})

test('deterministic runtime failure terminal is process-wide and sticky', async () => {
  const runtime = new DeterministicCodexChatRuntime({
    threadIds: ['thread-native', 'unused-thread'],
    turns: [
      {
        input: { threadId: 'thread-native', text: 'hello' },
        turnId: 'turn-native',
        events: [
          {
            type: 'runtime.failed',
            code: 'runtime_lost',
            displayMessage: 'The Codex runtime stopped unexpectedly.',
            mutationOutcomeKnown: true,
          },
        ],
      },
    ],
  })
  await runtime.startThread()
  const turn = await runtime.startTurn({
    threadId: 'thread-native',
    text: 'hello',
  })
  for await (const _event of turn.events) {
    // Exhaust the process-wide public terminal.
  }

  const terminal = await runtime.terminal
  assert.equal(terminal.code, 'runtime_lost')
  assert.equal(terminal.displayMessage, 'The Codex runtime stopped unexpectedly.')
  assert.equal(terminal.unknownOutcome, false)
  assert.equal(await runtime.terminal, terminal)

  await assert.rejects(
    () => runtime.releaseThread({ threadId: 'thread-native' }),
    /failed/,
  )
  await assert.rejects(() => runtime.startThread(), /failed/)
  await assert.rejects(
    () =>
      runtime.interrupt({
        threadId: 'thread-native',
        turnId: 'turn-native',
      }),
    /failed/,
  )
  await assert.rejects(
    () =>
      runtime.startTurn({
        threadId: 'thread-native',
        text: 'later',
      }),
    /failed/,
  )
  await runtime.close()
  await runtime.close()
})

async function settlesBeforeImmediate<T>(promise: Promise<T>): Promise<boolean> {
  return Promise.race([
    promise.then(
      () => true,
      () => true,
    ),
    new Promise<false>((resolve) => setImmediate(() => resolve(false))),
  ])
}
