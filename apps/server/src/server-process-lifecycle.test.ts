import assert from 'node:assert/strict'
import test from 'node:test'

import {
  installServerProcessSignalHandlers,
  type ServerProcessSignal,
  type ServerProcessSignalSource,
} from './server-process-lifecycle.js'

class FakeProcessSignalSource implements ServerProcessSignalSource {
  readonly pid = 4242
  private readonly listeners = new Map<
    ServerProcessSignal,
    Set<() => void>
  >()
  readonly kills: { readonly pid: number; readonly signal: ServerProcessSignal }[] =
    []

  once(signal: ServerProcessSignal, listener: () => void): void {
    const listeners = this.listeners.get(signal) ?? new Set()
    listeners.add(listener)
    this.listeners.set(signal, listeners)
  }

  off(signal: ServerProcessSignal, listener: () => void): void {
    this.listeners.get(signal)?.delete(listener)
  }

  kill(pid: number, signal: ServerProcessSignal): true {
    this.kills.push({ pid, signal })
    return true
  }

  emit(signal: ServerProcessSignal): void {
    for (const listener of this.listeners.get(signal) ?? []) listener()
  }

  listenerCount(signal: ServerProcessSignal): number {
    return this.listeners.get(signal)?.size ?? 0
  }
}

test('process signal wiring waits for one bounded close before re-signalling', async () => {
  const signalSource = new FakeProcessSignalSource()
  let closeCalls = 0
  let releaseClose!: () => void
  const closeFinished = new Promise<void>((resolve) => {
    releaseClose = resolve
  })
  const reSignalled = new Promise<void>((resolve) => {
    const originalKill = signalSource.kill.bind(signalSource)
    signalSource.kill = (pid, signal) => {
      originalKill(pid, signal)
      resolve()
      return true
    }
  })

  installServerProcessSignalHandlers(
    {
      close: async () => {
        closeCalls += 1
        await closeFinished
      },
    },
    { signalSource, logError: () => assert.fail('close must remain green') },
  )

  assert.equal(signalSource.listenerCount('SIGINT'), 1)
  assert.equal(signalSource.listenerCount('SIGTERM'), 1)
  signalSource.emit('SIGTERM')
  signalSource.emit('SIGINT')
  await new Promise<void>((resolve) => setImmediate(resolve))
  assert.equal(closeCalls, 1)
  assert.deepEqual(signalSource.kills, [])

  releaseClose()
  await reSignalled
  assert.deepEqual(signalSource.kills, [{ pid: 4242, signal: 'SIGTERM' }])
  assert.equal(signalSource.listenerCount('SIGINT'), 0)
  assert.equal(signalSource.listenerCount('SIGTERM'), 0)
})
