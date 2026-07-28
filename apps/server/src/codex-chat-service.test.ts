import assert from 'node:assert/strict'
import test from 'node:test'

import type {
  CodexProductTurn,
  CodexWorkspaceRuntime,
  StartProductTurnInput,
} from '@ay-ple/codex-chat-runtime'

import {
  createCodexChatComposition,
} from './codex-chat.js'
import {
  codexChatIdentity,
  ControlledRuntime,
} from './testing/codex-chat-test-support.js'

test('a prepared Product thread is reused without creating a second native thread', async () => {
  const runtime = new CapturingProductRuntime()
  let acquireProductThreadCalls = 0
  const composition = createCodexChatComposition({
    bootstrap: {
      ...codexChatIdentity,
      createRuntime: async () => runtime,
      async acquireProductThread(actualRuntime: CodexWorkspaceRuntime) {
        acquireProductThreadCalls += 1
        assert.equal(actualRuntime, runtime)
        return 'thread-pre-acquired'
      },
    },
  })

  try {
    for (const text of [
      '준비된 thread에서 계속 작업해 줘.',
      '같은 thread에서 후속 작업도 계속해 줘.',
    ]) {
      const turn = await composition.service.startProductTurn(
        {
          permissionProfile: 'workspace_write',
          text,
        },
        () => false,
      )
      assert.ok(turn)
      runtime.emit({
        type: 'turn.completed',
        threadId: turn.threadId,
        turnId: turn.turnId,
        status: 'completed',
      })
      await composition.service.streamProductTurn(turn, undefined)
    }

    assert.equal(acquireProductThreadCalls, 1)
    assert.equal(runtime.startThreadCalls, 0)
    assert.deepEqual(runtime.productThreadIds, [
      'thread-pre-acquired',
      'thread-pre-acquired',
    ])
  } finally {
    await composition.close()
  }
})

test('an empty prepared Product thread identity is rejected before turn start', async () => {
  const runtime = new CapturingProductRuntime()
  const composition = createCodexChatComposition({
    bootstrap: {
      ...codexChatIdentity,
      createRuntime: async () => runtime,
      acquireProductThread: async () => '',
    },
  })

  try {
    await assert.rejects(
      composition.service.startProductTurn(
        {
          permissionProfile: 'workspace_write',
          text: '빈 thread identity를 사용하면 안 돼.',
        },
        () => false,
      ),
      /Native Codex thread identity must be a nonempty string/,
    )
    assert.equal(runtime.startThreadCalls, 0)
    assert.deepEqual(runtime.productThreadIds, [])
  } finally {
    await composition.close()
  }
})

class CapturingProductRuntime extends ControlledRuntime {
  readonly productThreadIds: string[] = []

  override startProductTurn(
    input: StartProductTurnInput,
  ): Promise<CodexProductTurn> {
    this.productThreadIds.push(input.threadId)
    return super.startProductTurn(input)
  }
}
