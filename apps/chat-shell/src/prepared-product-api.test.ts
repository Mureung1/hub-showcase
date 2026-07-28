import assert from 'node:assert/strict'
import test from 'node:test'

import {
  PreparedProductApiError,
  streamPreparedChat,
} from './prepared-product-api.js'

test('prepared Browser stream rejects an unknown operation frame', async () => {
  const originalFetch = globalThis.fetch
  let requestBody: string | undefined
  globalThis.fetch = async (_input, init) => {
    requestBody = String(init?.body)
    return new Response(
      `${JSON.stringify({
        type: 'unknown.frame',
        operationId: `action_${'1'.repeat(32)}`,
      })}\n`,
      {
        status: 200,
        headers: { 'content-type': 'application/x-ndjson' },
      },
    )
  }
  try {
    await assert.rejects(
      streamPreparedChat({ text: '학기 작업을 도와 줘.' }, () => undefined),
      PreparedProductApiError,
    )
    assert.deepEqual(JSON.parse(requestBody ?? ''), {
      text: '학기 작업을 도와 줘.',
    })
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('prepared Browser sends the selected Codex settings as one complete triple', async () => {
  const originalFetch = globalThis.fetch
  let requestBody: string | undefined
  globalThis.fetch = async (_input, init) => {
    requestBody = String(init?.body)
    return new Response('', {
      status: 200,
      headers: { 'content-type': 'application/x-ndjson' },
    })
  }
  try {
    await streamPreparedChat(
      {
        text: '학기 작업을 도와 줘.',
        codexSettings: {
          model: 'gpt-current',
          reasoningEffort: 'high',
          serviceTier: 'fast',
        },
      },
      () => undefined,
    )
    assert.deepEqual(JSON.parse(requestBody ?? ''), {
      text: '학기 작업을 도와 줘.',
      codexSettings: {
        model: 'gpt-current',
        reasoningEffort: 'high',
        serviceTier: 'fast',
      },
    })
  } finally {
    globalThis.fetch = originalFetch
  }
})
