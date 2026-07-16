import assert from 'node:assert/strict'
import test from 'node:test'

import {
  CODEX_CHAT_APPROVAL_MODE,
  CODEX_CHAT_SANDBOX,
  parseCodexChatStatus,
  parseCodexChatStreamFrame,
  parseCodexChatThread,
} from './contract.js'

test('parses every browser-safe runtime status without widening policy fields', () => {
  const policy = {
    approvalMode: CODEX_CHAT_APPROVAL_MODE,
    sandbox: CODEX_CHAT_SANDBOX,
  }

  assert.deepEqual(
    parseCodexChatStatus({
      ...policy,
      state: 'unavailable',
      reason: 'not_configured',
    }),
    {
      ...policy,
      state: 'unavailable',
      reason: 'not_configured',
    },
  )
  assert.deepEqual(
    parseCodexChatStatus({
      ...policy,
      state: 'ready',
      sourceCommit: '8c68d4c87dc54d38861f5114e920c3de2efa5876',
      runtimeVersion: '0.144.4',
    }),
    {
      ...policy,
      state: 'ready',
      sourceCommit: '8c68d4c87dc54d38861f5114e920c3de2efa5876',
      runtimeVersion: '0.144.4',
    },
  )
  for (const state of ['configured', 'starting'] as const) {
    assert.deepEqual(
      parseCodexChatStatus({
        ...policy,
        state,
        sourceCommit: '8c68d4c87dc54d38861f5114e920c3de2efa5876',
        runtimeVersion: '0.144.4',
      }),
      {
        ...policy,
        state,
        sourceCommit: '8c68d4c87dc54d38861f5114e920c3de2efa5876',
        runtimeVersion: '0.144.4',
      },
    )
  }
  assert.deepEqual(
    parseCodexChatStatus({
      ...policy,
      state: 'failed',
      sourceCommit: '8c68d4c87dc54d38861f5114e920c3de2efa5876',
      runtimeVersion: '0.144.4',
      failureCode: 'runtime_lost',
    }),
    {
      ...policy,
      state: 'failed',
      sourceCommit: '8c68d4c87dc54d38861f5114e920c3de2efa5876',
      runtimeVersion: '0.144.4',
      failureCode: 'runtime_lost',
    },
  )

  assert.throws(() =>
    parseCodexChatStatus({
      ...policy,
      state: 'ready',
      sourceCommit: 'commit',
      runtimeVersion: '0.144.4',
      rawConfiguration: '/private/workspace',
    }),
  )
  assert.throws(() =>
    parseCodexChatStatus({
      approvalMode: 'accept_all',
      sandbox: CODEX_CHAT_SANDBOX,
      state: 'unavailable',
      reason: 'not_configured',
    }),
  )
})

test('parses native thread and turn acceptance identities exactly', () => {
  assert.deepEqual(parseCodexChatThread({ threadId: 'thread-native-A' }), {
    threadId: 'thread-native-A',
  })
  assert.deepEqual(
    parseCodexChatStreamFrame({
      type: 'turn.accepted',
      threadId: 'thread-native-A',
      turnId: 'turn-native-A1',
    }),
    {
      type: 'turn.accepted',
      threadId: 'thread-native-A',
      turnId: 'turn-native-A1',
    },
  )

  assert.throws(() =>
    parseCodexChatThread({
      threadId: 'thread-native-A',
      generationRef: 'private-ref',
    }),
  )
  assert.throws(() =>
    parseCodexChatStreamFrame({
      type: 'turn.accepted',
      threadId: 'thread-native-A',
      turnId: '',
    }),
  )
})

test('parses stream events through the existing browser-safe event decoder', () => {
  assert.deepEqual(
    parseCodexChatStreamFrame({
      type: 'agent_message.delta',
      threadId: 'thread-native-A',
      turnId: 'turn-native-A1',
      itemId: 'item-native-A1',
      delta: '안녕',
    }),
    {
      type: 'agent_message.delta',
      threadId: 'thread-native-A',
      turnId: 'turn-native-A1',
      itemId: 'item-native-A1',
      delta: '안녕',
    },
  )
  assert.throws(() =>
    parseCodexChatStreamFrame({
      type: 'agent_message.delta',
      threadId: 'thread-native-A',
      turnId: 'turn-native-A1',
      itemId: 'item-native-A1',
      delta: '안녕',
      raw: { secret: true },
    }),
  )
})
