import assert from 'node:assert/strict'
import test from 'node:test'
import { AgentRuntimeKernel } from '@ay-ple/runtime-core'
import { withFakeCodexAppServer } from '@ay-ple/runtime-codex/testing'
import { CodexRuntimeAdapter } from './index.js'

test('CodexRuntimeAdapter maps Codex turn notifications to normalized run output', async () => {
  await withFakeCodexAppServer(
    {
      userAgent: 'fake-codex-turn-server',
      threadId: 'thread-1',
      turnId: 'turn-1',
      agentMessageDeltas: [
        {
          turnId: 'other-turn',
          itemId: 'ignored-item',
          delta: 'ignored turn',
        },
        {
          threadId: 'other-thread',
          itemId: 'ignored-item',
          delta: 'ignored thread',
        },
        {
          itemId: 'item-1',
          delta: 'Hello ',
        },
        {
          itemId: 'item-1',
          delta: 'from Codex',
        },
      ],
      turnCompletions: [
        {
          turnId: 'other-turn',
          status: 'completed',
        },
        {
          status: 'failed',
        },
        {
          status: 'completed',
        },
      ],
    },
    async ({ rawClientOptions }) => {
      const adapter = new CodexRuntimeAdapter({
        rawClientOptions,
      })
      const kernel = new AgentRuntimeKernel({
        adapters: [adapter],
        now: () => new Date('2026-07-09T00:00:00.000Z'),
      })

      const startedLog = kernel.startRun({
        adapter: 'codex',
        prompt: 'Explain runtime parity',
      })
      const completedLog = await kernel.waitForRun(startedLog.runId)

      assert.equal(completedLog.status, 'completed')
      assert.equal(completedLog.output, 'Hello from Codex')
      assert.deepEqual(
        completedLog.events.map((event) => event.type),
        ['started', 'output_delta', 'output_delta', 'completed'],
      )
      assert.deepEqual(
        completedLog.events
          .filter((event) => event.type === 'output_delta')
          .map((event) => event.delta),
        ['Hello ', 'from Codex'],
      )

      const debugLog = completedLog.debugLog ?? []
      const outboundMessages = debugLog
        .filter((entry) => entry.source === 'client' && entry.kind === 'stdin')
        .map((entry) => JSON.parse(entry.raw ?? '{}') as Record<string, unknown>)

      assert.deepEqual(
        outboundMessages.map((message) => message.method),
        ['initialize', 'initialized', 'thread/start', 'turn/start'],
      )

      const turnStart = outboundMessages.find(
        (message) => message.method === 'turn/start',
      )

      assert.deepEqual(turnStart?.params, {
        threadId: 'thread-1',
        input: [
          {
            type: 'text',
            text: 'Explain runtime parity',
            text_elements: [],
          },
        ],
      })
      assert.ok(
        debugLog.some(
          (entry) =>
            entry.source === 'server' &&
            entry.kind === 'notification' &&
            entry.data?.method === 'item/agentMessage/delta',
        ),
        'expected agent delta notification in debug log',
      )
      assert.ok(
        debugLog.some(
          (entry) =>
            entry.source === 'server' &&
            entry.kind === 'notification' &&
            entry.data?.method === 'turn/completed',
        ),
        'expected turn completed notification in debug log',
      )
    },
  )
})
