import assert from 'node:assert/strict'
import { Writable } from 'node:stream'
import test from 'node:test'

import {
  AggregateOperationQueueBudget,
  CodexChatEventStream,
} from './event-stream.js'
import { SerializedBridgeWriter } from './serialized-writer.js'

test('bounds queued writes and rejects queued work once when cancelled', async () => {
  const callbacks: Array<(error?: Error | null) => void> = []
  const sink = new Writable({
    write(_chunk, _encoding, callback) {
      callbacks.push(callback)
    },
  })
  let overflows = 0
  const aggregate = new AggregateOperationQueueBudget(2, 4)
  const writer = new SerializedBridgeWriter(sink, {
    maxFrames: 2,
    maxBytes: 4,
    aggregate,
    onOverflow: () => {
      overflows += 1
    },
  })

  const first = writer.write(Buffer.from('aa'))
  const second = writer.write(Buffer.from('bb'))
  assert.deepEqual(aggregate.snapshot(), { frames: 2, bytes: 4 })
  await assert.rejects(writer.write(Buffer.from('c')), /buffer limit/)
  assert.equal(overflows, 1)
  assert.deepEqual(aggregate.snapshot(), { frames: 2, bytes: 4 })

  callbacks.shift()?.()
  await first
  assert.deepEqual(aggregate.snapshot(), { frames: 1, bytes: 2 })
  assert.equal(callbacks.length, 1)
  const cancelled = new Error('cancelled')
  writer.cancel(cancelled)
  await assert.rejects(second, (error: unknown) => error === cancelled)
  await assert.rejects(
    writer.write(Buffer.from('d')),
    (error: unknown) => error === cancelled,
  )
  callbacks.shift()?.()
  assert.deepEqual(aggregate.snapshot(), { frames: 0, bytes: 0 })
})

test('shares one aggregate budget with retained turn events', async () => {
  const callbacks: Array<(error?: Error | null) => void> = []
  const sink = new Writable({
    write(_chunk, _encoding, callback) {
      callbacks.push(callback)
    },
  })
  const aggregate = new AggregateOperationQueueBudget(2, 4)
  const writer = new SerializedBridgeWriter(sink, {
    maxFrames: 2,
    maxBytes: 4,
    aggregate,
    onOverflow: () => assert.fail('writer should fit the exact boundary'),
  })
  let eventOverflows = 0
  const events = new CodexChatEventStream({
    maxFrames: 2,
    maxBytes: 4,
    aggregate,
    onOverflow: () => {
      eventOverflows += 1
    },
  })
  const write = writer.write(Buffer.from('aa'))
  events.push(
    {
      type: 'agent_message.delta',
      threadId: 'thread-1',
      turnId: 'turn-1',
      itemId: 'item-1',
      delta: 'a',
    },
    2,
  )
  assert.deepEqual(aggregate.snapshot(), { frames: 2, bytes: 4 })
  events.push(
    {
      type: 'agent_message.delta',
      threadId: 'thread-1',
      turnId: 'turn-1',
      itemId: 'item-1',
      delta: 'b',
    },
    1,
  )
  assert.equal(eventOverflows, 1)

  callbacks.shift()?.()
  await write
  const iterator = events[Symbol.asyncIterator]()
  await iterator.return?.()
  assert.deepEqual(aggregate.snapshot(), { frames: 0, bytes: 0 })
})
