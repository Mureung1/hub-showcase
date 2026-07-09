import assert from 'node:assert/strict'
import test from 'node:test'
import {
  AgentRuntimeKernel,
  type AgentRuntimeAdapter,
  type RuntimeAdapterEvent,
  type RuntimeAdapterRunInput,
} from './index.js'

class HappyPathAdapter implements AgentRuntimeAdapter {
  readonly name = 'test'

  async *run(input: RuntimeAdapterRunInput): AsyncIterable<RuntimeAdapterEvent> {
    yield { type: 'output_delta', delta: `Echo: ${input.prompt}` }
    yield { type: 'completed' }
  }
}

class HangingAdapter implements AgentRuntimeAdapter {
  readonly name = 'test'

  async *run(input: RuntimeAdapterRunInput): AsyncIterable<RuntimeAdapterEvent> {
    await new Promise<void>((resolve) => {
      input.signal.addEventListener('abort', () => resolve(), { once: true })
    })
    yield { type: 'output_delta', delta: 'late output' }
    yield { type: 'completed' }
  }
}

class FailingAdapter implements AgentRuntimeAdapter {
  readonly name = 'test'

  async *run(): AsyncIterable<RuntimeAdapterEvent> {
    throw new Error('Adapter exploded')
  }
}

class DebugLogAdapter implements AgentRuntimeAdapter {
  readonly name = 'test'

  async *run(): AsyncIterable<RuntimeAdapterEvent> {
    yield {
      type: 'debug_log',
      entries: [
        {
          timestamp: '2026-07-09T00:00:00.000Z',
          source: 'server',
          kind: 'notification',
          message: 'observed raw notification',
          data: { method: 'turn/completed' },
        },
      ],
    }
    yield { type: 'completed' }
  }
}

test('AgentRuntimeKernel records a completed run lifecycle and log', async () => {
  const kernel = new AgentRuntimeKernel({
    adapters: [new HappyPathAdapter()],
    now: () => new Date('2026-07-09T00:00:00.000Z'),
  })

  const startedLog = kernel.startRun({ adapter: 'test', prompt: '정리해줘' })
  const completedLog = await kernel.waitForRun(startedLog.runId)
  const events = completedLog.events

  assert.deepEqual(
    events.map((event) => event.type),
    ['started', 'output_delta', 'completed'],
  )

  assert.equal(events[0]?.sequence, 1)
  assert.equal(events[1]?.sequence, 2)
  assert.equal(events[2]?.sequence, 3)
  assert.equal(events[0]?.runId, events[1]?.runId)
  assert.equal(events[1]?.runId, events[2]?.runId)

  const runId = startedLog.runId
  const log = kernel.getRunLog(runId)
  const history = kernel.listRuns()

  assert.equal(log?.prompt, '정리해줘')
  assert.equal(log?.status, 'completed')
  assert.equal(log?.output, 'Echo: 정리해줘')
  assert.deepEqual(
    log?.events.map((event) => event.type),
    ['started', 'output_delta', 'completed'],
  )
  assert.deepEqual(history, [
    {
      adapter: 'test',
      completedAt: '2026-07-09T00:00:00.000Z',
      error: undefined,
      outputPreview: 'Echo: 정리해줘',
      prompt: '정리해줘',
      runId,
      startedAt: '2026-07-09T00:00:00.000Z',
      status: 'completed',
    },
  ])
})

test('AgentRuntimeKernel records a cancelled run lifecycle and log', async () => {
  const kernel = new AgentRuntimeKernel({
    adapters: [new HangingAdapter()],
    now: () => new Date('2026-07-09T00:00:00.000Z'),
  })

  const startedLog = kernel.startRun({ adapter: 'test', prompt: '멈춰줘' })
  const cancelledLog = kernel.cancelRun(startedLog.runId)
  const waitedLog = await kernel.waitForRun(startedLog.runId)
  const runId = startedLog.runId

  assert.equal(cancelledLog?.status, 'cancelled')
  assert.equal(waitedLog.status, 'cancelled')
  assert.deepEqual(
    waitedLog.events.map((event) => event.type),
    ['started', 'cancelled'],
  )
  assert.equal(waitedLog.events[1]?.sequence, 2)

  const cancelledEvent = waitedLog.events[1]
  assert.equal(cancelledEvent?.type, 'cancelled')

  if (cancelledEvent?.type === 'cancelled') {
    assert.equal(cancelledEvent.reason, 'Runtime run cancelled')
  }

  assert.deepEqual(kernel.listRuns(), [
    {
      adapter: 'test',
      completedAt: undefined,
      error: undefined,
      outputPreview: '',
      prompt: '멈춰줘',
      runId,
      startedAt: '2026-07-09T00:00:00.000Z',
      status: 'cancelled',
    },
  ])
})

test('AgentRuntimeKernel records a failed run lifecycle and log', async () => {
  const kernel = new AgentRuntimeKernel({
    adapters: [new FailingAdapter()],
    now: () => new Date('2026-07-09T00:00:00.000Z'),
  })

  const startedLog = kernel.startRun({ adapter: 'test', prompt: '실패해줘' })
  const failedLog = await kernel.waitForRun(startedLog.runId)
  const runId = startedLog.runId

  assert.equal(failedLog.status, 'failed')
  assert.equal(failedLog.error, 'Adapter exploded')
  assert.deepEqual(
    failedLog.events.map((event) => event.type),
    ['started', 'failed'],
  )

  const failedEvent = failedLog.events[1]
  assert.equal(failedEvent?.type, 'failed')

  if (failedEvent?.type === 'failed') {
    assert.equal(failedEvent.error, 'Adapter exploded')
  }

  assert.deepEqual(kernel.listRuns(), [
    {
      adapter: 'test',
      completedAt: undefined,
      error: 'Adapter exploded',
      outputPreview: '',
      prompt: '실패해줘',
      runId,
      startedAt: '2026-07-09T00:00:00.000Z',
      status: 'failed',
    },
  ])
})

test('AgentRuntimeKernel records adapter debug log entries outside normalized events', async () => {
  const kernel = new AgentRuntimeKernel({
    adapters: [new DebugLogAdapter()],
    now: () => new Date('2026-07-09T00:00:00.000Z'),
  })

  const startedLog = kernel.startRun({ adapter: 'test', prompt: '관측해줘' })
  const completedLog = await kernel.waitForRun(startedLog.runId)

  assert.deepEqual(
    completedLog.events.map((event) => event.type),
    ['started', 'completed'],
  )
  assert.deepEqual(completedLog.debugLog, [
    {
      timestamp: '2026-07-09T00:00:00.000Z',
      source: 'server',
      kind: 'notification',
      message: 'observed raw notification',
      data: { method: 'turn/completed' },
    },
  ])
})
