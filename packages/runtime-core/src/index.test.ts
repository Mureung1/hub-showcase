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
    await waitForAbort(input.signal)
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

class CancelDebugLogAdapter implements AgentRuntimeAdapter {
  readonly name = 'test'

  async *run(input: RuntimeAdapterRunInput): AsyncIterable<RuntimeAdapterEvent> {
    await waitForAbort(input.signal)

    yield {
      type: 'debug_log',
      entries: [
        {
          timestamp: '2026-07-09T00:00:00.000Z',
          source: 'client',
          kind: 'stdin',
          message: 'interrupt sent after cancellation',
          data: { method: 'turn/interrupt' },
        },
      ],
    }
    yield { type: 'completed' }
  }
}

class AdapterConfirmedCancelAdapter implements AgentRuntimeAdapter {
  readonly name = 'test'
  readonly cancellationMode = 'adapter_confirmed'

  async *run(input: RuntimeAdapterRunInput): AsyncIterable<RuntimeAdapterEvent> {
    await waitForAbort(input.signal)
    yield { type: 'cancelled', reason: 'Adapter confirmed cancellation' }
  }
}

class AdapterConfirmedCancelFailureAdapter implements AgentRuntimeAdapter {
  readonly name = 'test'
  readonly cancellationMode = 'adapter_confirmed'

  async *run(input: RuntimeAdapterRunInput): AsyncIterable<RuntimeAdapterEvent> {
    await waitForAbort(input.signal)
    yield { type: 'failed', error: 'Adapter cancellation failed' }
  }
}

class AdapterConfirmedCancelWithoutTerminalAdapter
  implements AgentRuntimeAdapter
{
  readonly name = 'test'
  readonly cancellationMode = 'adapter_confirmed'

  async *run(input: RuntimeAdapterRunInput): AsyncIterable<RuntimeAdapterEvent> {
    await waitForAbort(input.signal)
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

test('AgentRuntimeKernel retains debug log entries yielded after cancellation', async () => {
  const kernel = new AgentRuntimeKernel({
    adapters: [new CancelDebugLogAdapter()],
    now: () => new Date('2026-07-09T00:00:00.000Z'),
  })

  const startedLog = kernel.startRun({ adapter: 'test', prompt: '멈춰줘' })
  const cancelledLog = kernel.cancelRun(startedLog.runId)
  const logWithDebug = await waitForRunLog(
    () => kernel.getRunLog(startedLog.runId),
    (log) => (log.debugLog?.length ?? 0) > 0,
  )

  assert.equal(cancelledLog?.status, 'cancelled')
  assert.equal(logWithDebug.status, 'cancelled')
  assert.deepEqual(
    logWithDebug.events.map((event) => event.type),
    ['started', 'cancelled'],
  )
  assert.deepEqual(logWithDebug.debugLog, [
    {
      timestamp: '2026-07-09T00:00:00.000Z',
      source: 'client',
      kind: 'stdin',
      message: 'interrupt sent after cancellation',
      data: { method: 'turn/interrupt' },
    },
  ])
})

test('AgentRuntimeKernel supports adapter-confirmed cancellation', async () => {
  const kernel = new AgentRuntimeKernel({
    adapters: [new AdapterConfirmedCancelAdapter()],
    now: () => new Date('2026-07-09T00:00:00.000Z'),
  })

  const startedLog = kernel.startRun({ adapter: 'test', prompt: '멈춰줘' })
  const cancellingLog = kernel.cancelRun(startedLog.runId)
  const terminalLog = await kernel.waitForRun(startedLog.runId)

  assert.equal(cancellingLog?.status, 'cancelling')
  assert.equal(terminalLog.status, 'cancelled')
  assert.deepEqual(
    terminalLog.events.map((event) => event.type),
    ['started', 'cancelling', 'cancelled'],
  )

  const cancellingEvent = terminalLog.events[1]
  assert.equal(cancellingEvent?.type, 'cancelling')

  if (cancellingEvent?.type === 'cancelling') {
    assert.equal(cancellingEvent.reason, 'Runtime run cancellation requested')
  }
})

test('AgentRuntimeKernel records adapter-confirmed cancellation failure', async () => {
  const kernel = new AgentRuntimeKernel({
    adapters: [new AdapterConfirmedCancelFailureAdapter()],
    now: () => new Date('2026-07-09T00:00:00.000Z'),
  })

  const startedLog = kernel.startRun({ adapter: 'test', prompt: '멈춰줘' })
  const cancellingLog = kernel.cancelRun(startedLog.runId)
  const terminalLog = await kernel.waitForRun(startedLog.runId)

  assert.equal(cancellingLog?.status, 'cancelling')
  assert.equal(terminalLog.status, 'failed')
  assert.equal(terminalLog.error, 'Adapter cancellation failed')
  assert.deepEqual(
    terminalLog.events.map((event) => event.type),
    ['started', 'cancelling', 'failed'],
  )
})

test('AgentRuntimeKernel fails adapter-confirmed cancellation without terminal confirmation', async () => {
  const kernel = new AgentRuntimeKernel({
    adapters: [new AdapterConfirmedCancelWithoutTerminalAdapter()],
    now: () => new Date('2026-07-09T00:00:00.000Z'),
  })

  const startedLog = kernel.startRun({ adapter: 'test', prompt: '멈춰줘' })
  const cancellingLog = kernel.cancelRun(startedLog.runId)
  const terminalLog = await kernel.waitForRun(startedLog.runId)

  assert.equal(cancellingLog?.status, 'cancelling')
  assert.equal(terminalLog.status, 'failed')
  assert.equal(
    terminalLog.error,
    'Runtime run cancellation was not confirmed by adapter',
  )
  assert.deepEqual(
    terminalLog.events.map((event) => event.type),
    ['started', 'cancelling', 'failed'],
  )
})

async function waitForRunLog(
  getLog: () => ReturnType<AgentRuntimeKernel['getRunLog']>,
  predicate: (log: NonNullable<ReturnType<AgentRuntimeKernel['getRunLog']>>) => boolean,
): Promise<NonNullable<ReturnType<AgentRuntimeKernel['getRunLog']>>> {
  const deadline = Date.now() + 500

  while (Date.now() < deadline) {
    const log = getLog()

    if (log && predicate(log)) {
      return log
    }

    await new Promise<void>((resolve) => {
      setImmediate(resolve)
    })
  }

  assert.fail('expected run log condition was not observed')
}

async function waitForAbort(signal: AbortSignal): Promise<void> {
  if (signal.aborted) {
    return
  }

  await new Promise<void>((resolve) => {
    signal.addEventListener('abort', () => resolve(), { once: true })
  })
}
