import assert from 'node:assert/strict'
import test from 'node:test'

import { parseCodexChatEvent } from './contract.js'
import {
  BridgeProtocolError,
  NdjsonBridgeFramer,
  decodeBridgeOutputFrame,
} from './bridge-protocol.js'

test('frames fragmented UTF-8 and coalesced bridge lines without reordering', () => {
  const framer = new NdjsonBridgeFramer()
  const bytes = Buffer.from(
    '{"type":"ready"}\n' +
      '{"type":"event","bridgeRequestId":"turn-1","event":{"type":"agent_message.delta","threadId":"thread-1","turnId":"turn-1","itemId":"item-1","delta":"한"}}\n' +
      '{"type":"event","bridgeRequestId":"turn-1","event":{"type":"turn.completed","threadId":"thread-1","turnId":"turn-1","status":"completed"}}\n',
  )
  const split = bytes.indexOf(Buffer.from('한')) + 1

  assert.deepEqual(framer.push(bytes.subarray(0, split)), [{ type: 'ready' }])
  assert.deepEqual(
    framer.push(bytes.subarray(split)),
    [
      {
        type: 'event',
        bridgeRequestId: 'turn-1',
        event: {
          type: 'agent_message.delta',
          threadId: 'thread-1',
          turnId: 'turn-1',
          itemId: 'item-1',
          delta: '한',
        },
      },
      {
        type: 'event',
        bridgeRequestId: 'turn-1',
        event: {
          type: 'turn.completed',
          threadId: 'thread-1',
          turnId: 'turn-1',
          status: 'completed',
        },
      },
    ],
  )
  framer.finish()
})

test('decodes exact command-specific results and rejects extra wire fields', () => {
  assert.deepEqual(
    decodeBridgeOutputFrame(
      Buffer.from(
        '{"type":"result","bridgeRequestId":"thread","command":"start_thread","threadId":"native-thread"}\n',
      ),
    ),
    {
      type: 'result',
      bridgeRequestId: 'thread',
      command: 'start_thread',
      threadId: 'native-thread',
    },
  )

  assert.throws(
    () =>
      decodeBridgeOutputFrame(
        Buffer.from(
          '{"type":"result","bridgeRequestId":"thread","command":"start_thread","threadId":"native-thread","raw":{"secret":true}}\n',
        ),
      ),
    (error: unknown) =>
      error instanceof BridgeProtocolError && error.code === 'invalid_frame',
  )
})

test('parses the browser-safe event union without accepting bridge correlation', () => {
  assert.deepEqual(
    parseCodexChatEvent({
      type: 'runtime.failed',
      code: 'runtime_lost',
      displayMessage: 'The Codex runtime connection was lost.',
      mutationOutcomeKnown: true,
    }),
    {
      type: 'runtime.failed',
      code: 'runtime_lost',
      displayMessage: 'The Codex runtime connection was lost.',
      mutationOutcomeKnown: true,
    },
  )
  assert.throws(() =>
    parseCodexChatEvent({
      type: 'turn.completed',
      threadId: 'thread-1',
      turnId: 'turn-1',
      status: 'completed',
      bridgeRequestId: 'private',
    }),
  )
})

test('rejects invalid UTF-8 and an unterminated final frame', () => {
  const invalid = new NdjsonBridgeFramer()
  assert.throws(
    () => invalid.push(Buffer.from([0xff, 0x0a])),
    (error: unknown) =>
      error instanceof BridgeProtocolError && error.code === 'invalid_utf8',
  )

  const unterminated = new NdjsonBridgeFramer()
  assert.deepEqual(unterminated.push(Buffer.from('{"type":"ready"}')), [])
  assert.throws(
    () => unterminated.finish(),
    (error: unknown) =>
      error instanceof BridgeProtocolError && error.code === 'incomplete_frame',
  )
})
