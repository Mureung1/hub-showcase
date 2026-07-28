import assert from 'node:assert/strict'
import test from 'node:test'

import {
  createPreparedProductThreadHandoff,
} from './server-development.js'
import { ControlledRuntime } from './testing/codex-chat-test-support.js'

test('prepared host hands the one startup thread to every Product turn acquisition', async () => {
  const handoff = createPreparedProductThreadHandoff()
  const runtime = new ControlledRuntime()

  handoff.bindRuntime(runtime)
  const startupThread = await runtime.startThread()
  handoff.bindProductThread(startupThread.threadId)

  assert.equal(await handoff.createRuntime(), runtime)
  assert.equal(
    await handoff.acquireProductThread(runtime),
    startupThread.threadId,
  )
  assert.equal(
    await handoff.acquireProductThread(runtime),
    startupThread.threadId,
  )
  assert.equal(runtime.startThreadCalls, 1)
})

test('prepared host rejects cross-generation Runtime or thread replacement', async () => {
  const handoff = createPreparedProductThreadHandoff()
  const runtime = new ControlledRuntime()
  const replacement = new ControlledRuntime()

  assert.throws(
    () => handoff.bindProductThread('thread-too-early'),
    /Runtime is not bound/,
  )
  handoff.bindRuntime(runtime)
  assert.throws(
    () => handoff.bindRuntime(replacement),
    /Runtime was already bound/,
  )
  handoff.bindProductThread('thread-startup')
  assert.throws(
    () => handoff.bindProductThread('thread-replacement'),
    /thread was already bound/,
  )
  await assert.rejects(
    handoff.acquireProductThread(replacement),
    /Runtime changed/,
  )
})
