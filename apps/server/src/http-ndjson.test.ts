import assert from 'node:assert/strict'
import { EventEmitter } from 'node:events'
import test from 'node:test'

import {
  type NdjsonWritable,
  writeNdjsonLine,
} from './codex-chat.js'

class BackpressuredWritable extends EventEmitter implements NdjsonWritable {
  destroyed = false
  writableEnded = false
  writeResult = false
  destroyCalls = 0
  cleanupCalls = 0
  readonly chunks: string[] = []

  write(chunk: string): boolean {
    this.chunks.push(chunk)
    return this.writeResult
  }

  destroy(): void {
    this.destroyCalls += 1
    this.destroyed = true
    this.emit('close')
  }

  override off(
    event: 'close' | 'drain',
    listener: () => void,
  ): this {
    this.cleanupCalls += 1
    return super.off(event, listener)
  }
}

test('Codex Chat NDJSON writer waits for drain and serializes acceptance frames', async () => {
  const response = new BackpressuredWritable()
  const writePromise = writeNdjsonLine(
    response,
    {
      type: 'turn.accepted',
      threadId: 'thread-A',
      turnId: 'turn-A1',
    },
    100,
  )
  let settled = false
  void writePromise.then(() => {
    settled = true
  })

  await new Promise((resolve) => setImmediate(resolve))
  assert.equal(settled, false)
  assert.equal(response.listenerCount('drain'), 1)
  assert.equal(response.listenerCount('close'), 1)

  response.emit('drain')

  assert.equal(await writePromise, true)
  assert.deepEqual(response.chunks, [
    '{"type":"turn.accepted","threadId":"thread-A","turnId":"turn-A1"}\n',
  ])
  assert.equal(response.destroyCalls, 0)
  assert.equal(response.cleanupCalls, 2)
  assert.equal(response.listenerCount('drain'), 0)
  assert.equal(response.listenerCount('close'), 0)
})

test('Codex Chat NDJSON writer destroys a stalled response at its deadline', async () => {
  const response = new BackpressuredWritable()

  assert.equal(
    await writeNdjsonLine(
      response,
      {
        type: 'agent_message.delta',
        threadId: 'thread-A',
        turnId: 'turn-A1',
        itemId: 'item-A1',
        delta: '안녕',
      },
      5,
    ),
    false,
  )
  assert.equal(response.destroyCalls, 1)
  assert.equal(response.cleanupCalls, 2)
  assert.equal(response.listenerCount('drain'), 0)
  assert.equal(response.listenerCount('close'), 0)
  assert.deepEqual(response.chunks, [
    '{"type":"agent_message.delta","threadId":"thread-A","turnId":"turn-A1","itemId":"item-A1","delta":"안녕"}\n',
  ])
})

test('Codex Chat NDJSON writer cancels its deadline when close wins the race', async () => {
  const response = new BackpressuredWritable()
  const writePromise = writeNdjsonLine(
    response,
    {
      type: 'turn.accepted',
      threadId: 'thread-A',
      turnId: 'turn-A1',
    },
    20,
  )

  response.emit('close')

  assert.equal(await writePromise, false)
  await new Promise((resolve) => setTimeout(resolve, 30))
  assert.equal(response.destroyCalls, 0)
  assert.equal(response.cleanupCalls, 2)
  assert.equal(response.listenerCount('drain'), 0)
  assert.equal(response.listenerCount('close'), 0)
})

test('Codex Chat NDJSON writer settles once when timeout-triggered destroy emits close', async () => {
  const response = new BackpressuredWritable()
  let settlements = 0
  const writePromise = writeNdjsonLine(
    response,
    {
      type: 'turn.accepted',
      threadId: 'thread-A',
      turnId: 'turn-A1',
    },
    5,
  ).then((written) => {
    settlements += 1
    return written
  })

  assert.equal(await writePromise, false)
  await new Promise((resolve) => setImmediate(resolve))
  assert.equal(settlements, 1)
  assert.equal(response.destroyCalls, 1)
  assert.equal(response.cleanupCalls, 2)
})

test('Codex Chat NDJSON writer returns false when the socket write throws', async () => {
  const response = new BackpressuredWritable()
  response.write = () => {
    throw new Error('socket write failed')
  }

  assert.equal(
    await writeNdjsonLine(
      response,
      {
        type: 'turn.accepted',
        threadId: 'thread-A',
        turnId: 'turn-A1',
      },
      5,
    ),
    false,
  )
  assert.equal(response.destroyCalls, 0)
})
