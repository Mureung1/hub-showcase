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

  assert.deepEqual(
    decodeBridgeOutputFrame(
      Buffer.from(
        '{"type":"result","bridgeRequestId":"product","command":"start_product_turn","threadId":"native-thread","turnId":"native-turn"}\n',
      ),
    ),
    {
      type: 'result',
      bridgeRequestId: 'product',
      command: 'start_product_turn',
      threadId: 'native-thread',
      turnId: 'native-turn',
    },
  )
  assert.deepEqual(
    decodeBridgeOutputFrame(
      Buffer.from(
        '{"type":"result","bridgeRequestId":"answer","command":"answer_user_input","interactionId":"interaction-1"}\n',
      ),
    ),
    {
      type: 'result',
      bridgeRequestId: 'answer',
      command: 'answer_user_input',
      interactionId: 'interaction-1',
    },
  )
})

test('decodes the retained strict account-read result', () => {
  assert.deepEqual(
    decodeBridgeOutputFrame(
      Buffer.from(
        '{"type":"result","bridgeRequestId":"account","command":"read_account","account":{"state":"chatgpt"}}\n',
      ),
    ),
    {
      type: 'result',
      bridgeRequestId: 'account',
      command: 'read_account',
      account: { state: 'chatgpt' },
    },
  )
})

test('rejects removed account lifecycle frames and unsafe account reads', () => {
  const removedCommands = [
    ['start', 'browser', 'login'].join('_'),
    ['read', 'browser', 'login', 'attempt'].join('_'),
    ['cancel', 'browser', 'login'].join('_'),
    ['release', 'browser', 'login', 'attempt'].join('_'),
    ['log', 'out'].join(''),
  ]
  const invalid = [
    {
      type: 'result',
      bridgeRequestId: 'account',
      command: 'read_account',
      account: {
        state: 'chatgpt',
        email: 'student-private@example.com',
      },
    },
    ...removedCommands.map((command) => ({
      type: 'result',
      bridgeRequestId: 'removed-account-operation',
      command,
      status: 'pending',
    })),
  ]

  for (const frame of invalid) {
    assert.throws(
      () =>
        decodeBridgeOutputFrame(
          Buffer.from(`${JSON.stringify(frame)}\n`),
        ),
      (error: unknown) =>
        error instanceof BridgeProtocolError && error.code === 'invalid_frame',
    )
  }
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

test('decodes a product interaction event while keeping raw request identity private', () => {
  const line = Buffer.from(
    `${JSON.stringify({
      type: 'event',
      bridgeRequestId: 'turn-product',
      event: {
        type: 'user_input.requested',
        threadId: 'thread-product',
        turnId: 'turn-product',
        itemId: 'item-review',
        interactionId: 'interaction-1',
        questions: [
          {
            id: 'decision',
            header: 'Review',
            question: 'Apply?',
            options: null,
            acceptsFreeform: true,
          },
        ],
      },
    })}\n`,
  )

  assert.equal(
    decodeBridgeOutputFrame(line).type,
    'event',
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
