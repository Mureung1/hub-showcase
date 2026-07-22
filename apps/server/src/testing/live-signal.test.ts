import assert from 'node:assert/strict'
import { test } from 'node:test'

import {
  LiveSignalInterruptedError,
  runWithLiveSignalAbort,
  type LiveSignal,
  type LiveSignalSource,
} from './live-signal.js'

class FakeSignalSource implements LiveSignalSource {
  private readonly listeners = new Map<LiveSignal, Set<() => void>>()

  on(signal: LiveSignal, listener: () => void): void {
    const listeners = this.listeners.get(signal) ?? new Set()
    listeners.add(listener)
    this.listeners.set(signal, listeners)
  }

  off(signal: LiveSignal, listener: () => void): void {
    this.listeners.get(signal)?.delete(listener)
  }

  emit(signal: LiveSignal): void {
    for (const listener of this.listeners.get(signal) ?? []) listener()
  }

  listenerCount(signal: LiveSignal): number {
    return this.listeners.get(signal)?.size ?? 0
  }
}

test('signal abort waits for cleanup and removes installed listeners', async () => {
  const signalSource = new FakeSignalSource()
  let releaseCleanup!: () => void
  const cleanup = new Promise<void>((resolve) => {
    releaseCleanup = resolve
  })
  let cleanupFinished = false

  const running = runWithLiveSignalAbort(async (signal) => {
    await new Promise<void>((resolve) => {
      signal.addEventListener('abort', () => resolve(), { once: true })
    })
    await cleanup
    cleanupFinished = true
  }, signalSource)
  const observed = running.then(
    () => ({ status: 'resolved' as const }),
    (error: unknown) => ({ status: 'rejected' as const, error }),
  )

  assert.equal(signalSource.listenerCount('SIGINT'), 1)
  assert.equal(signalSource.listenerCount('SIGTERM'), 1)
  signalSource.emit('SIGTERM')
  await new Promise<void>((resolve) => setImmediate(resolve))
  assert.equal(cleanupFinished, false)
  assert.equal(signalSource.listenerCount('SIGINT'), 1)
  assert.equal(signalSource.listenerCount('SIGTERM'), 1)

  releaseCleanup()
  const outcome = await observed
  assert.equal(outcome.status, 'rejected')
  assert.ok(
    outcome.status === 'rejected' &&
      outcome.error instanceof LiveSignalInterruptedError,
  )
  if (outcome.status === 'rejected') {
    assert.equal((outcome.error as LiveSignalInterruptedError).signal, 'SIGTERM')
  }
  assert.equal(cleanupFinished, true)
  assert.equal(signalSource.listenerCount('SIGINT'), 0)
  assert.equal(signalSource.listenerCount('SIGTERM'), 0)
})
