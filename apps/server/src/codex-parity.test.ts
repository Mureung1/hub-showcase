import assert from 'node:assert/strict'
import test from 'node:test'
import { AgentRuntimeKernel } from '@ay-ple/runtime-core'
import { CodexRuntimeAdapter } from '@ay-ple/runtime-codex'
import { withFakeCodexAppServer } from '@ay-ple/runtime-codex/testing'
import {
  parseCodexParityTimeout,
  verifyCodexCancellationParity,
  verifyCodexPreflight,
  verifyCodexPromptParity,
} from './codex-parity.js'
import { createServerApp, type CreateServerAppOptions } from './server.js'

test('parseCodexParityTimeout uses a bounded positive integer', () => {
  assert.equal(parseCodexParityTimeout(undefined), 60000)
  assert.equal(parseCodexParityTimeout('2500'), 2500)

  for (const value of ['0', '-1', '1.5', 'invalid']) {
    assert.throws(
      () => parseCodexParityTimeout(value),
      /CODEX_PARITY_TIMEOUT_MS must be a positive integer/,
    )
  }
})

test('Codex parity preflight rejects a binary that does not match the package pin', async () => {
  await withFakeCodexAppServer({}, async ({ rawClientOptions }) => {
    await withTestServer(
      { codexRawClientOptions: rawClientOptions },
      async (baseUrl) => {
        await assert.rejects(
          verifyCodexPreflight(baseUrl, { timeoutMs: 1000 }),
          /does not match package pin 0\.144\.0/,
        )
      },
    )
  })
})

test('Codex prompt parity verifier crosses HTTP and SSE', async () => {
  await withFakeCodexAppServer(
    {
      threadId: 'thread-parity-prompt',
      turnId: 'turn-parity-prompt',
      agentMessageDeltas: [
        {
          delta: 'Parity prompt output',
        },
      ],
    },
    async ({ rawClientOptions }) => {
      const kernel = new AgentRuntimeKernel({
        adapters: [
          new CodexRuntimeAdapter({
            rawClientOptions,
          }),
        ],
      })

      await withTestServer({ kernel }, async (baseUrl) => {
        const result = await verifyCodexPromptParity(baseUrl, {
          timeoutMs: 1000,
        })

        assert.equal(result.status, 'completed')
        assert.deepEqual(result.eventTypes, [
          'started',
          'output_delta',
          'completed',
        ])
        assert.ok(result.debugEvidenceCount > 0)
      })
    },
  )
})

test('Codex cancellation parity verifier waits for active output and confirms interrupt', async () => {
  await withFakeCodexAppServer(
    {
      threadId: 'thread-parity-cancel',
      turnId: 'turn-parity-cancel',
      agentMessageDeltas: [
        {
          delta: '1\n',
        },
      ],
      turnCompletions: [],
      interruptTurnCompletion: {
        status: 'interrupted',
      },
    },
    async ({ rawClientOptions }) => {
      const kernel = new AgentRuntimeKernel({
        adapters: [
          new CodexRuntimeAdapter({
            rawClientOptions,
          }),
        ],
      })

      await withTestServer({ kernel }, async (baseUrl) => {
        const result = await verifyCodexCancellationParity(baseUrl, {
          timeoutMs: 1000,
        })

        assert.equal(result.status, 'cancelled')
        assert.deepEqual(result.eventTypes, [
          'started',
          'output_delta',
          'cancelling',
          'cancelled',
        ])
        assert.ok(result.debugEvidenceCount > 0)
      })
    },
  )
})

async function withTestServer(
  options: CreateServerAppOptions,
  testBody: (baseUrl: string) => Promise<void>,
): Promise<void> {
  const server = createServerApp(options).listen(0, '127.0.0.1')

  await new Promise<void>((resolve) => {
    server.once('listening', resolve)
  })

  const address = server.address()

  if (!address || typeof address === 'string') {
    throw new Error('Expected server to listen on a TCP port')
  }

  try {
    await testBody(`http://127.0.0.1:${address.port}`)
  } finally {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => {
        if (error) {
          reject(error)
          return
        }

        resolve()
      })
      server.closeAllConnections()
    })
  }
}
