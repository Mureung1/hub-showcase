import assert from 'node:assert/strict'
import test from 'node:test'

import {
  createInitialChatState,
  reduceChatState,
} from './chat-model.js'

test('reconciles one native turn by thread, turn, and item identity', () => {
  let state = createInitialChatState()
  state = reduceChatState(state, {
    type: 'thread.started',
    threadId: 'thread-native-A',
  })
  state = reduceChatState(state, {
    type: 'turn.submitted',
    text: '이번 개념을 설명해줘',
  })
  state = reduceChatState(state, {
    type: 'stream.frame',
    frame: {
      type: 'turn.accepted',
      threadId: 'thread-native-A',
      turnId: 'turn-native-A1',
    },
  })
  state = reduceChatState(state, {
    type: 'stream.frame',
    frame: {
      type: 'agent_message.delta',
      threadId: 'thread-native-A',
      turnId: 'turn-native-A1',
      itemId: 'item-native-A1',
      delta: '핵심은 ',
    },
  })
  state = reduceChatState(state, {
    type: 'stream.frame',
    frame: {
      type: 'agent_message.delta',
      threadId: 'thread-native-A',
      turnId: 'turn-native-A1',
      itemId: 'item-native-A1',
      delta: '연결입니다.',
    },
  })

  assert.equal(state.phase, 'running')
  assert.equal(state.activeTurnId, 'turn-native-A1')
  assert.deepEqual(state.messages, [
    {
      kind: 'user',
      text: '이번 개념을 설명해줘',
      turnId: 'turn-native-A1',
    },
    {
      kind: 'agent',
      itemId: 'item-native-A1',
      turnId: 'turn-native-A1',
      text: '핵심은 연결입니다.',
      status: 'streaming',
    },
  ])

  state = reduceChatState(state, {
    type: 'stream.frame',
    frame: {
      type: 'agent_message.completed',
      threadId: 'thread-native-A',
      turnId: 'turn-native-A1',
      itemId: 'item-native-A1',
      text: '핵심은 개념 사이의 연결입니다.',
    },
  })
  state = reduceChatState(state, {
    type: 'stream.frame',
    frame: {
      type: 'turn.completed',
      threadId: 'thread-native-A',
      turnId: 'turn-native-A1',
      status: 'completed',
    },
  })

  assert.equal(state.phase, 'completed')
  assert.equal(state.activeTurnId, undefined)
  assert.deepEqual(state.terminal, {
    turnId: 'turn-native-A1',
    status: 'completed',
  })
  assert.deepEqual(state.messages[1], {
    kind: 'agent',
    itemId: 'item-native-A1',
    turnId: 'turn-native-A1',
    text: '핵심은 개념 사이의 연결입니다.',
    status: 'completed',
  })
})

test('keeps retryable turn errors nonterminal until the matching terminal', () => {
  let state = acceptedState()
  state = reduceChatState(state, {
    type: 'stream.frame',
    frame: {
      type: 'turn.error',
      threadId: 'thread-native-A',
      turnId: 'turn-native-A1',
      willRetry: true,
      code: 'httpConnectionFailed',
      displayMessage: 'Codex reported a turn error.',
    },
  })

  assert.equal(state.phase, 'running')
  assert.equal(state.activeTurnId, 'turn-native-A1')
  assert.equal(state.notices.length, 1)

  state = reduceChatState(state, {
    type: 'stream.frame',
    frame: {
      type: 'agent_message.delta',
      threadId: 'thread-native-A',
      turnId: 'turn-native-A1',
      itemId: 'item-native-A1',
      delta: '다시 연결했습니다.',
    },
  })
  assert.equal(state.phase, 'running')

  state = reduceChatState(state, {
    type: 'stream.frame',
    frame: {
      type: 'turn.completed',
      threadId: 'thread-native-A',
      turnId: 'turn-native-A1',
      status: 'completed',
    },
  })
  assert.equal(state.phase, 'completed')
  assert.equal(state.activeTurnId, undefined)
})

test('keeps turn failure distinct from process-wide runtime failure', () => {
  const streamingTurn = reduceChatState(acceptedState(), {
    type: 'stream.frame',
    frame: {
      type: 'agent_message.delta',
      threadId: 'thread-native-A',
      turnId: 'turn-native-A1',
      itemId: 'item-native-A1',
      delta: '완료되지 않은 답변',
    },
  })
  const turnFailed = reduceChatState(streamingTurn, {
    type: 'stream.frame',
    frame: {
      type: 'turn.completed',
      threadId: 'thread-native-A',
      turnId: 'turn-native-A1',
      status: 'failed',
      failure: {
        code: 'serverOverloaded',
        displayMessage: 'Codex failed the turn.',
      },
    },
  })
  assert.equal(turnFailed.phase, 'turn-failed')
  assert.equal(turnFailed.activeTurnId, undefined)
  assert.deepEqual(turnFailed.failure, {
    code: 'serverOverloaded',
    displayMessage: 'Codex failed the turn.',
  })
  assert.deepEqual(turnFailed.messages[1], {
    kind: 'agent',
    itemId: 'item-native-A1',
    turnId: 'turn-native-A1',
    text: '완료되지 않은 답변',
    status: 'stopped',
  })

  const runtimeFailed = reduceChatState(streamingTurn, {
    type: 'stream.frame',
    frame: {
      type: 'runtime.failed',
      code: 'runtime_lost',
      displayMessage: 'The Codex runtime connection was lost.',
      mutationOutcomeKnown: false,
    },
  })
  assert.equal(runtimeFailed.phase, 'runtime-failed')
  assert.equal(runtimeFailed.activeTurnId, undefined)
  assert.equal(runtimeFailed.terminal, undefined)
  assert.deepEqual(runtimeFailed.failure, {
    code: 'runtime_lost',
    displayMessage: 'The Codex runtime connection was lost.',
  })
  const partialMessage = runtimeFailed.messages[1]
  assert.equal(partialMessage?.kind, 'agent')
  if (partialMessage?.kind === 'agent') {
    assert.equal(partialMessage.status, 'stopped')
  }
})

test('clears a pending submission when the HTTP mutation fails safely', () => {
  let state = createInitialChatState()
  state = reduceChatState(state, {
    type: 'thread.started',
    threadId: 'thread-native-A',
  })
  state = reduceChatState(state, {
    type: 'turn.submitted',
    text: '질문',
  })
  state = reduceChatState(state, {
    type: 'turn.request-failed',
    failure: {
      code: 'codex_chat_unavailable',
      displayMessage: 'Codex Chat is unavailable.',
    },
  })

  assert.equal(state.phase, 'request-failed')
  assert.equal(state.activeTurnId, undefined)
  assert.deepEqual(state.failure, {
    code: 'codex_chat_unavailable',
    displayMessage: 'Codex Chat is unavailable.',
  })
})

test('converges malformed identity and post-terminal frames to one safe failure', () => {
  const mismatched = reduceChatState(acceptedState(), {
    type: 'stream.frame',
    frame: {
      type: 'agent_message.delta',
      threadId: 'thread-native-B',
      turnId: 'turn-native-A1',
      itemId: 'item-native-A1',
      delta: 'raw data must not surface',
    },
  })
  assertSafeStreamFailure(mismatched)

  const terminal = reduceChatState(acceptedState(), {
    type: 'stream.frame',
    frame: {
      type: 'turn.completed',
      threadId: 'thread-native-A',
      turnId: 'turn-native-A1',
      status: 'completed',
    },
  })
  const late = reduceChatState(terminal, {
    type: 'stream.frame',
    frame: {
      type: 'agent_message.delta',
      threadId: 'thread-native-A',
      turnId: 'turn-native-A1',
      itemId: 'item-native-A1',
      delta: 'late',
    },
  })
  assertSafeStreamFailure(late)
})

function acceptedState() {
  let state = createInitialChatState()
  state = reduceChatState(state, {
    type: 'thread.started',
    threadId: 'thread-native-A',
  })
  state = reduceChatState(state, {
    type: 'turn.submitted',
    text: '질문',
  })
  return reduceChatState(state, {
    type: 'stream.frame',
    frame: {
      type: 'turn.accepted',
      threadId: 'thread-native-A',
      turnId: 'turn-native-A1',
    },
  })
}

function assertSafeStreamFailure(
  state: ReturnType<typeof createInitialChatState>,
) {
  assert.equal(state.phase, 'runtime-failed')
  assert.equal(state.activeTurnId, undefined)
  assert.deepEqual(state.failure, {
    code: 'invalid_stream',
    displayMessage: '대화 스트림을 확인할 수 없습니다.',
  })
}
