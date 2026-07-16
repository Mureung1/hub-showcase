import assert from 'node:assert/strict'
import test from 'node:test'

import { writeNdjsonLine } from './codex-chat.js'
import { BackpressuredResponse } from './testing/codex-chat-test-support.js'

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

  const throwingResponse = new BackpressuredResponse()
  throwingResponse.write = () => {
    throw new Error('socket write failed')
  }
  assert.equal(
    await writeNdjsonLine(throwingResponse, {
      type: 'turn.accepted',
      threadId: 'thread-A',
      turnId: 'turn-A1',
    }),
    false,
  )
})
