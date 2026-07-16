import assert from 'node:assert/strict'
import test from 'node:test'

import type { CodexChatEvent } from './contract.js'
import {
  AggregateOperationQueueBudget,
  CodexChatEventStream,
} from './event-stream.js'
import { DEFAULT_NODE_RUNTIME_BUDGETS } from './runtime.js'

const EVENT: CodexChatEvent = {
  type: 'agent_message.delta',
  threadId: 'thread-1',
  turnId: 'turn-1',
  itemId: 'item-1',
  delta: 'x',
}

test('pins Node queue defaults and releases exact byte accounting on consume and return', async () => {
  assert.deepEqual(DEFAULT_NODE_RUNTIME_BUDGETS, {
    operationMaxFrames: 4096,
    operationMaxBytes: 16 * 1024 * 1024,
    aggregateMaxFrames: 8192,
    aggregateMaxBytes: 32 * 1024 * 1024,
    stderrMaxFrames: 4096,
    stderrMaxBytes: 16 * 1024 * 1024,
  })

  const aggregate = new AggregateOperationQueueBudget(3, 6)
  let overflow = 0
  const first = new CodexChatEventStream({
    maxFrames: 2,
    maxBytes: 4,
    aggregate,
    onOverflow: () => {
      overflow += 1
    },
  })
  first.push(EVENT, 2)
  first.push(EVENT, 2)
  assert.deepEqual(aggregate.snapshot(), { frames: 2, bytes: 4 })
  first.push(EVENT, 1)
  assert.equal(overflow, 1)

  const iterator = first[Symbol.asyncIterator]()
  assert.equal((await iterator.next()).done, false)
  assert.deepEqual(aggregate.snapshot(), { frames: 1, bytes: 2 })
  await iterator.return?.()
  assert.deepEqual(aggregate.snapshot(), { frames: 0, bytes: 0 })

  const second = new CodexChatEventStream({
    maxFrames: 3,
    maxBytes: 6,
    aggregate,
    onOverflow: () => {
      overflow += 1
    },
  })
  second.push(EVENT, 3)
  second.push(EVENT, 3)
  assert.deepEqual(aggregate.snapshot(), { frames: 2, bytes: 6 })
  second.fail({
    type: 'runtime.failed',
    code: 'buffer_overflow',
    displayMessage: 'The Codex runtime buffer limit was exceeded.',
    mutationOutcomeKnown: true,
  })
  assert.deepEqual(aggregate.snapshot(), { frames: 0, bytes: 0 })
})

test('enforces aggregate frame limits across independent turn queues', () => {
  const aggregate = new AggregateOperationQueueBudget(2, 100)
  let overflow = 0
  const makeStream = () =>
    new CodexChatEventStream({
      maxFrames: 2,
      maxBytes: 4,
      aggregate,
      onOverflow: () => {
        overflow += 1
      },
    })
  const first = makeStream()
  const second = makeStream()
  first.push(EVENT, 2)
  second.push(EVENT, 2)
  second.push(EVENT, 1)
  assert.equal(overflow, 1)
  assert.deepEqual(aggregate.snapshot(), { frames: 2, bytes: 4 })
})

test('enforces aggregate byte limits independently of its frame limit', () => {
  const aggregate = new AggregateOperationQueueBudget(10, 4)
  let overflow = 0
  const first = new CodexChatEventStream({
    maxFrames: 10,
    maxBytes: 10,
    aggregate,
    onOverflow: () => {
      overflow += 1
    },
  })
  const second = new CodexChatEventStream({
    maxFrames: 10,
    maxBytes: 10,
    aggregate,
    onOverflow: () => {
      overflow += 1
    },
  })
  first.push(EVENT, 2)
  second.push(EVENT, 2)
  second.push(EVENT, 1)
  assert.equal(overflow, 1)
  assert.deepEqual(aggregate.snapshot(), { frames: 2, bytes: 4 })
})
