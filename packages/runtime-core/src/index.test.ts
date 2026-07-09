import assert from 'node:assert/strict'
import test from 'node:test'
import {
  AgentRuntimeKernel,
  type AgentRuntimeAdapter,
  type RuntimeAdapterRunInput,
  type RuntimeAdapterEvent,
} from './index.js'

class HappyPathAdapter implements AgentRuntimeAdapter {
  readonly name = 'test'

  async *run(input: RuntimeAdapterRunInput): AsyncIterable<RuntimeAdapterEvent> {
    yield { type: 'output_delta', delta: `Echo: ${input.prompt}` }
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
      outputPreview: 'Echo: 정리해줘',
      prompt: '정리해줘',
      runId,
      startedAt: '2026-07-09T00:00:00.000Z',
      status: 'completed',
    },
  ])
})
