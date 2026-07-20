import assert from 'node:assert/strict'
import test from 'node:test'

import { CodexChatRuntimeError } from './errors.js'
import { DeterministicCodexChatRuntime } from './testing.js'

function isInteractionNotPending(error: unknown): boolean {
  assert.ok(error instanceof CodexChatRuntimeError)
  assert.equal(error.code, 'interaction_not_pending')
  assert.equal(
    error.displayMessage,
    'The user-input interaction is not pending.',
  )
  assert.equal(error.unknownOutcome, false)
  return true
}

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

test('deterministic runtime records an isolated workspace and private MCP thread input', async () => {
  const runtime = new DeterministicCodexChatRuntime({
    threadIds: ['thread-product'],
  })
  const input = {
    workspace: '/workspace/semester-a',
    mcp: {
      url: 'http://127.0.0.1:43127/mcp',
      token: 'private-mcp-token',
    },
  } as const

  assert.deepEqual(await runtime.startThread(input), {
    threadId: 'thread-product',
  })
  assert.deepEqual(runtime.calls, [
    { operation: 'startThread', input },
  ])
})

test('deterministic runtime reports account not-ready without starting native work', async () => {
  const runtime = new DeterministicCodexChatRuntime({
    accountReadiness: [
      { state: 'not_ready', reason: 'authentication_required' },
      { state: 'ready' },
    ],
  })

  assert.deepEqual(await runtime.readAccountReadiness(), {
    state: 'not_ready',
    reason: 'authentication_required',
  })
  assert.deepEqual(runtime.calls, [{ operation: 'readAccountReadiness' }])

  assert.deepEqual(await runtime.readAccountReadiness(), { state: 'ready' })
  assert.deepEqual(runtime.calls, [
    { operation: 'readAccountReadiness' },
    { operation: 'readAccountReadiness' },
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

test('deterministic product turn preserves structured input and same-turn user-input continuation', async () => {
  const input = {
    threadId: 'thread-product',
    skill: {
      name: 'assignment-modeling',
      path: '/managed/assignment-modeling/SKILL.md',
    },
    text: 'Use [공지](/staged/lms-outline-notice.md) with course=자료구조.',
  } as const
  const runtime = new DeterministicCodexChatRuntime({
    threadIds: ['thread-product'],
    productTurns: [
      {
        input,
        turnId: 'turn-product',
        events: [
          {
            type: 'skill.requested',
            threadId: 'thread-product',
            turnId: 'turn-product',
            skillName: 'assignment-modeling',
          },
          {
            type: 'user_input.requested',
            threadId: 'thread-product',
            turnId: 'turn-product',
            itemId: 'item-review',
            interactionId: 'interaction-1',
            questions: [
              {
                id: 'decision',
                header: 'Review',
                question: 'Apply this proposal?',
                options: null,
                acceptsFreeform: true,
              },
            ],
          },
          {
            type: 'user_input.resolved',
            threadId: 'thread-product',
            turnId: 'turn-product',
            itemId: 'item-review',
            interactionId: 'interaction-1',
            resolution: 'answered',
          },
          {
            type: 'turn.completed',
            threadId: 'thread-product',
            turnId: 'turn-product',
            status: 'completed',
          },
        ],
      },
    ],
  })
  await runtime.startThread()

  const turn = await runtime.startProductTurn(input)
  const events = turn.events[Symbol.asyncIterator]()
  assert.equal((await events.next()).value.type, 'skill.requested')
  assert.equal((await events.next()).value.type, 'user_input.requested')

  const acknowledgement = runtime.answerUserInput({
    interactionId: 'interaction-1',
    answers: { decision: ['Accept'] },
  })
  assert.equal(await settlesBeforeImmediate(acknowledgement), false)
  await assert.rejects(
    () =>
      runtime.cancelUserInput({ interactionId: 'interaction-1' }),
    isInteractionNotPending,
  )

  const continuation = events.next()
  assert.equal((await continuation).value.type, 'user_input.resolved')
  await acknowledgement
  assert.equal((await events.next()).value.type, 'turn.completed')
  assert.deepEqual(runtime.calls, [
    { operation: 'startThread' },
    { operation: 'startProductTurn', input },
    {
      operation: 'answerUserInput',
      input: {
        interactionId: 'interaction-1',
        answers: { decision: ['Accept'] },
      },
    },
    {
      operation: 'cancelUserInput',
      input: { interactionId: 'interaction-1' },
    },
  ])
})

test('deterministic product turn supports text-only input without a requested Skill', async () => {
  const input = {
    threadId: 'thread-product',
    text: 'Continue the product conversation.',
  } as const
  const runtime = new DeterministicCodexChatRuntime({
    threadIds: [input.threadId],
    productTurns: [
      {
        input,
        turnId: 'turn-product',
        events: [
          {
            type: 'plan.completed',
            threadId: input.threadId,
            turnId: 'turn-product',
            itemId: 'plan-1',
            text: 'Continue safely.',
          },
          {
            type: 'turn.completed',
            threadId: input.threadId,
            turnId: 'turn-product',
            status: 'completed',
          },
        ],
      },
    ],
  })
  await runtime.startThread()

  const turn = await runtime.startProductTurn(input)

  assert.deepEqual(await collect(turn.events), [
    {
      type: 'plan.completed',
      threadId: input.threadId,
      turnId: 'turn-product',
      itemId: 'plan-1',
      text: 'Continue safely.',
    },
    {
      type: 'turn.completed',
      threadId: input.threadId,
      turnId: 'turn-product',
      status: 'completed',
    },
  ])
  assert.deepEqual(runtime.calls, [
    { operation: 'startThread' },
    { operation: 'startProductTurn', input },
  ])
})

test('deterministic product continuation rejects a scripted resolution that disagrees with cancel', async () => {
  const input = {
    threadId: 'thread-product',
    skill: { name: 'model', path: '/managed/model/SKILL.md' },
    text: 'Review staged Markdown.',
  } as const
  const runtime = new DeterministicCodexChatRuntime({
    threadIds: [input.threadId],
    productTurns: [
      {
        input,
        turnId: 'turn-product',
        events: [
          {
            type: 'user_input.requested',
            threadId: input.threadId,
            turnId: 'turn-product',
            itemId: 'item-review',
            interactionId: 'interaction-1',
            questions: [
              {
                id: 'decision',
                header: 'Review',
                question: 'Continue?',
                options: null,
                acceptsFreeform: true,
              },
            ],
          },
          {
            type: 'user_input.resolved',
            threadId: input.threadId,
            turnId: 'turn-product',
            itemId: 'item-review',
            interactionId: 'interaction-1',
            resolution: 'answered',
          },
        ],
      },
    ],
  })
  await runtime.startThread()
  const turn = await runtime.startProductTurn(input)
  const events = turn.events[Symbol.asyncIterator]()
  assert.equal((await events.next()).value.type, 'user_input.requested')

  const acknowledgement = runtime.cancelUserInput({
    interactionId: 'interaction-1',
  })
  assert.equal(await settlesBeforeImmediate(acknowledgement), false)
  const acknowledgementRejected = assert.rejects(
    acknowledgement,
    /resolution does not match/,
  )
  const continuation = events.next()
  await assert.rejects(continuation, /resolution does not match/)
  await acknowledgementRejected
  await runtime.close()
})

test('deterministic cleanup rejects an in-flight acknowledgement without resolved activity', async () => {
  const input = {
    threadId: 'thread-product',
    skill: { name: 'model', path: '/managed/model/SKILL.md' },
    text: 'Review staged Markdown.',
  } as const
  const runtime = new DeterministicCodexChatRuntime({
    threadIds: [input.threadId],
    productTurns: [
      {
        input,
        turnId: 'turn-product',
        events: [
          {
            type: 'user_input.requested',
            threadId: input.threadId,
            turnId: 'turn-product',
            itemId: 'item-review',
            interactionId: 'interaction-1',
            questions: [
              {
                id: 'decision',
                header: 'Review',
                question: 'Continue?',
                options: null,
                acceptsFreeform: true,
              },
            ],
          },
          {
            type: 'turn.completed',
            threadId: input.threadId,
            turnId: 'turn-product',
            status: 'interrupted',
          },
        ],
      },
    ],
  })
  await runtime.startThread()
  const turn = await runtime.startProductTurn(input)
  const events = turn.events[Symbol.asyncIterator]()
  assert.equal((await events.next()).value.type, 'user_input.requested')

  const acknowledgement = runtime.answerUserInput({
    interactionId: 'interaction-1',
    answers: { decision: ['Accept'] },
  })
  assert.equal(await settlesBeforeImmediate(acknowledgement), false)
  assert.equal((await events.next()).value.type, 'turn.completed')
  await assert.rejects(acknowledgement, isInteractionNotPending)
})

test('deterministic runtime failure rejects an in-flight interaction mutation with unknown outcome', async (t) => {
  for (const resolution of ['answered', 'cancelled'] as const) {
    await t.test(resolution, async () => {
      const input = {
        threadId: 'thread-product',
        skill: { name: 'model', path: '/managed/model/SKILL.md' },
        text: 'Review staged Markdown.',
      } as const
      const runtime = new DeterministicCodexChatRuntime({
        threadIds: [input.threadId],
        productTurns: [
          {
            input,
            turnId: 'turn-product',
            events: [
              {
                type: 'user_input.requested',
                threadId: input.threadId,
                turnId: 'turn-product',
                itemId: 'item-review',
                interactionId: 'interaction-1',
                questions: [
                  {
                    id: 'decision',
                    header: 'Review',
                    question: 'Continue?',
                    options: null,
                    acceptsFreeform: true,
                  },
                ],
              },
              {
                type: 'runtime.failed',
                code: 'runtime_lost',
                displayMessage: 'The Codex runtime connection was lost.',
                mutationOutcomeKnown: true,
              },
            ],
          },
        ],
      })
      await runtime.startThread()
      const turn = await runtime.startProductTurn(input)
      const events = turn.events[Symbol.asyncIterator]()
      assert.equal((await events.next()).value.type, 'user_input.requested')

      const acknowledgement =
        resolution === 'answered'
          ? runtime.answerUserInput({
              interactionId: 'interaction-1',
              answers: { decision: ['Accept'] },
            })
          : runtime.cancelUserInput({ interactionId: 'interaction-1' })
      assert.equal(await settlesBeforeImmediate(acknowledgement), false)
      assert.equal((await events.next()).value.type, 'runtime.failed')
      await assert.rejects(acknowledgement, (error: unknown) => {
        assert.ok(error instanceof CodexChatRuntimeError)
        assert.equal(error.code, 'runtime_lost')
        assert.equal(
          error.displayMessage,
          'The Codex runtime connection was lost.',
        )
        assert.equal(error.unknownOutcome, true)
        return true
      })
      assert.equal((await runtime.terminal).unknownOutcome, false)
    })
  }
})

test('deterministic product interrupt settles its pending interaction once', async () => {
  const input = {
    threadId: 'thread-product',
    skill: { name: 'model', path: '/managed/model/SKILL.md' },
    text: 'Review staged Markdown.',
  } as const
  const runtime = new DeterministicCodexChatRuntime({
    threadIds: [input.threadId],
    productTurns: [
      {
        input,
        turnId: 'turn-product',
        events: [
          {
            type: 'user_input.requested',
            threadId: input.threadId,
            turnId: 'turn-product',
            itemId: 'item-review',
            interactionId: 'interaction-1',
            questions: [
              {
                id: 'decision',
                header: 'Review',
                question: 'Continue?',
                options: null,
                acceptsFreeform: true,
              },
            ],
          },
          {
            type: 'turn.interrupt_acknowledged',
            threadId: input.threadId,
            turnId: 'turn-product',
          },
          {
            type: 'turn.completed',
            threadId: input.threadId,
            turnId: 'turn-product',
            status: 'interrupted',
          },
        ],
      },
    ],
  })
  await runtime.startThread()
  const turn = await runtime.startProductTurn(input)
  const events = turn.events[Symbol.asyncIterator]()
  assert.equal((await events.next()).value.type, 'user_input.requested')

  await runtime.interrupt({
    threadId: input.threadId,
    turnId: turn.turnId,
  })
  await assert.rejects(
    () =>
      runtime.answerUserInput({
        interactionId: 'interaction-1',
        answers: { decision: ['Accept'] },
      }),
    isInteractionNotPending,
  )
  assert.equal((await events.next()).value.type, 'turn.interrupt_acknowledged')
  assert.equal((await events.next()).value.type, 'turn.completed')
})

test('deterministic product terminal makes a pending interaction late', async () => {
  const input = {
    threadId: 'thread-product',
    skill: { name: 'model', path: '/managed/model/SKILL.md' },
    text: 'Review staged Markdown.',
  } as const
  const runtime = new DeterministicCodexChatRuntime({
    threadIds: [input.threadId],
    productTurns: [
      {
        input,
        turnId: 'turn-product',
        events: [
          {
            type: 'user_input.requested',
            threadId: input.threadId,
            turnId: 'turn-product',
            itemId: 'item-review',
            interactionId: 'interaction-1',
            questions: [
              {
                id: 'decision',
                header: 'Review',
                question: 'Continue?',
                options: null,
                acceptsFreeform: true,
              },
            ],
          },
          {
            type: 'turn.completed',
            threadId: input.threadId,
            turnId: 'turn-product',
            status: 'failed',
            failure: {
              code: 'turn_error',
              displayMessage: 'Codex failed the turn.',
            },
          },
        ],
      },
    ],
  })
  await runtime.startThread()
  const turn = await runtime.startProductTurn(input)
  const events = turn.events[Symbol.asyncIterator]()
  assert.equal((await events.next()).value.type, 'user_input.requested')
  assert.equal((await events.next()).value.type, 'turn.completed')

  await assert.rejects(
    () => runtime.cancelUserInput({ interactionId: 'interaction-1' }),
    isInteractionNotPending,
  )
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

async function collect<T>(events: AsyncIterable<T>): Promise<T[]> {
  const observed: T[] = []
  for await (const event of events) observed.push(event)
  return observed
}
