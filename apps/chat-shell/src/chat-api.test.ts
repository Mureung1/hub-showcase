import assert from 'node:assert/strict'
import test from 'node:test'

import type { CodexChatStreamFrame } from '@ay-ple/codex-chat-runtime/contract'

import {
  ChatStreamError,
  consumeCodexChatTurnResponse,
  decodeCodexChatNdjson,
} from './chat-api.js'

test('decodes fragmented UTF-8, coalesced lines, and final EOF without a newline', async () => {
  const encoded = new TextEncoder().encode(
    '{"type":"turn.accepted","threadId":"thread-A","turnId":"turn-A1"}\n' +
      '{"type":"agent_message.delta","threadId":"thread-A","turnId":"turn-A1","itemId":"item-A1","delta":"안녕"}\n' +
      '{"type":"turn.completed","threadId":"thread-A","turnId":"turn-A1","status":"completed"}',
  )
  const koreanByte = encoded.indexOf(0xec)
  const stream = streamFromChunks([
    encoded.subarray(0, koreanByte + 1),
    encoded.subarray(koreanByte + 1),
  ])

  const frames: CodexChatStreamFrame[] = []
  for await (const frame of decodeCodexChatNdjson(stream)) {
    frames.push(frame)
  }

  assert.deepEqual(
    frames.map((frame) => frame.type),
    ['turn.accepted', 'agent_message.delta', 'turn.completed'],
  )
  assert.equal(frames[1]?.type, 'agent_message.delta')
  if (frames[1]?.type === 'agent_message.delta') {
    assert.equal(frames[1].delta, '안녕')
  }
})

test('requires one matching acceptance and authoritative terminal', async () => {
  const validFrames: CodexChatStreamFrame[] = []
  await consumeCodexChatTurnResponse(
    ndjsonResponse([
      {
        type: 'turn.accepted',
        threadId: 'thread-A',
        turnId: 'turn-A1',
      },
      {
        type: 'turn.error',
        threadId: 'thread-A',
        turnId: 'turn-A1',
        willRetry: true,
        code: 'httpConnectionFailed',
        displayMessage: 'Codex reported a turn error.',
      },
      {
        type: 'turn.completed',
        threadId: 'thread-A',
        turnId: 'turn-A1',
        status: 'completed',
      },
    ]),
    'thread-A',
    (frame) => validFrames.push(frame),
  )
  assert.deepEqual(
    validFrames.map((frame) => frame.type),
    ['turn.accepted', 'turn.error', 'turn.completed'],
  )

  await assert.rejects(
    consumeCodexChatTurnResponse(
      ndjsonResponse([
        {
          type: 'agent_message.delta',
          threadId: 'thread-A',
          turnId: 'turn-A1',
          itemId: 'item-A1',
          delta: 'acceptance missing',
        },
      ]),
      'thread-A',
      () => undefined,
    ),
    ChatStreamError,
  )

  await assert.rejects(
    consumeCodexChatTurnResponse(
      ndjsonResponse([
        {
          type: 'turn.accepted',
          threadId: 'thread-B',
          turnId: 'turn-A1',
        },
      ]),
      'thread-A',
      () => undefined,
    ),
    ChatStreamError,
  )

  await assert.rejects(
    consumeCodexChatTurnResponse(
      ndjsonResponse([
        {
          type: 'turn.accepted',
          threadId: 'thread-A',
          turnId: 'turn-A1',
        },
      ]),
      'thread-A',
      () => undefined,
    ),
    ChatStreamError,
  )
})

test('rejects invalid JSON and invalid known frame shapes without exposing input', async () => {
  const invalidJson = streamFromChunks([
    new TextEncoder().encode('{"type":"turn.accepted",raw-secret}\n'),
  ])
  await assert.rejects(
    collect(decodeCodexChatNdjson(invalidJson)),
    (error: unknown) =>
      error instanceof ChatStreamError &&
      error.message === 'The Codex Chat stream is invalid.',
  )

  const invalidFrame = streamFromChunks([
    new TextEncoder().encode(
      '{"type":"turn.accepted","threadId":"thread-A","turnId":""}\n',
    ),
  ])
  await assert.rejects(
    collect(decodeCodexChatNdjson(invalidFrame)),
    ChatStreamError,
  )
})

function ndjsonResponse(frames: readonly CodexChatStreamFrame[]): Response {
  const body = frames.map((frame) => JSON.stringify(frame)).join('\n')
  return new Response(body, {
    status: 200,
    headers: { 'content-type': 'application/x-ndjson' },
  })
}

function streamFromChunks(
  chunks: readonly Uint8Array[],
): ReadableStream<Uint8Array> {
  return new ReadableStream({
    start(controller) {
      for (const chunk of chunks) controller.enqueue(chunk)
      controller.close()
    },
  })
}

async function collect<T>(iterable: AsyncIterable<T>): Promise<T[]> {
  const values: T[] = []
  for await (const value of iterable) values.push(value)
  return values
}
