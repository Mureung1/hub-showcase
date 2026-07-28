import assert from 'node:assert/strict'
import test from 'node:test'

import {
  DeterministicCodexProductRuntime,
} from '@ay-ple/codex-chat-runtime/testing'
import type {
  ProductReviewFrame,
  TargetProductOperationFrame,
} from '@ay-ple/product-contract'

import {
  createCodexChatComposition,
} from './codex-chat.js'
import {
  OrganizeSourcesActionError,
  type OrganizeSourcesAction,
} from './organize-sources-action.js'
import {
  createPreparedProductOperationCoordinator,
} from './prepared-product-operation-coordinator.js'
import { codexChatIdentity } from './testing/codex-chat-test-support.js'

test('the Product executor starts a Turn with the exact Codex settings snapshot it validated', async () => {
  const validatedSettings = {
    model: 'gpt-current',
    reasoningEffort: 'medium',
    serviceTier: 'default',
  } as const
  const runtime = new DeterministicCodexProductRuntime({
    accountReadiness: [{ state: 'ready' }],
    modelCatalogs: [
      {
        models: [
          {
            model: 'gpt-current',
            displayName: 'GPT Current',
            description: 'Current model',
            isDefault: true,
            defaultReasoningEffort: 'medium',
            supportedReasoningEfforts: [
              {
                reasoningEffort: 'medium',
                description: 'Balanced',
              },
            ],
            serviceTiers: ['default'],
          },
        ],
      },
    ],
    threadIds: ['thread-settings'],
    productTurns: [
      {
        input: {
          threadId: 'thread-settings',
          permissionProfile: 'workspace_write',
          settings: validatedSettings,
          skill: {
            name: 'ay-ple-first-assignment',
            path: '/workspace/.agents/skills/ay-ple-first-assignment/SKILL.md',
          },
          text: 'prepared action input',
        },
        turnId: 'turn-settings',
        events: [
          {
            type: 'turn.completed',
            threadId: 'thread-settings',
            turnId: 'turn-settings',
            status: 'completed',
          },
        ],
      },
    ],
  })
  const composition = createCodexChatComposition({
    bootstrap: {
      ...codexChatIdentity,
      createRuntime: async () => runtime,
      acquireProductThread: async (actualRuntime) =>
        (await actualRuntime.startThread()).threadId,
    },
  })
  const action = {
    async prepare() {
      return {
        permissionProfile: 'workspace_write',
        settings: {
          model: 'gpt-unvalidated',
          reasoningEffort: 'high',
          serviceTier: 'fast',
        },
        skill: {
          name: 'ay-ple-first-assignment',
          path: '/workspace/.agents/skills/ay-ple-first-assignment/SKILL.md',
        },
        text: 'prepared action input',
      }
    },
    async revalidateForDispatch() {},
    // Deliberately model a stale/rogue callback shape: executor-owned settings
    // must never be recovered from an action result after validation.
  } as unknown as OrganizeSourcesAction
  const frames: Array<
    TargetProductOperationFrame | ProductReviewFrame
  > = []
  const operations = createPreparedProductOperationCoordinator({
    service: composition.service,
    organizeSourcesAction: action,
    assertWorkspaceActive: () => undefined,
  })

  try {
    await operations.invokeAction(
      {
        action: 'organize_sources',
        files: [{ relativePath: 'materials/notice.md' }],
        codexSettings: validatedSettings,
      },
      {
        disconnected: () => false,
        sink: {
          async write(frame) {
            frames.push(structuredClone(frame))
            return true
          },
          end: () => undefined,
        },
      },
    )

    assert.deepEqual(
      runtime.calls.find(
        (call) => call.operation === 'startProductTurn',
      ),
      {
        operation: 'startProductTurn',
        input: {
          threadId: 'thread-settings',
          permissionProfile: 'workspace_write',
          settings: validatedSettings,
          skill: {
            name: 'ay-ple-first-assignment',
            path: '/workspace/.agents/skills/ay-ple-first-assignment/SKILL.md',
          },
          text: 'prepared action input',
        },
      },
    )
    assert.equal(
      frames.at(-1)?.type,
      'operation.terminal',
    )
    assert.equal(
      frames.at(-1)?.type === 'operation.terminal'
        ? frames.at(-1)?.status
        : undefined,
      'completed',
    )
  } finally {
    operations.beginShutdown()
    await composition.close()
  }
})

test('the Product executor revalidates a prepared action after preparing and before Runtime start', async () => {
  const runtime = new DeterministicCodexProductRuntime({
    accountReadiness: [{ state: 'ready' }],
    effectiveSkills: [[]],
  })
  const composition = createCodexChatComposition({
    bootstrap: {
      ...codexChatIdentity,
      createRuntime: async () => runtime,
      acquireProductThread: async (actualRuntime) =>
        (await actualRuntime.startThread()).threadId,
    },
  })
  const frames: Array<
    TargetProductOperationFrame | ProductReviewFrame
  > = []
  let runtimeTerminalCalls = 0
  let revalidationSignal: AbortSignal | undefined
  let releasePreparing!: () => void
  let observePreparing!: () => void
  const preparingReleased = new Promise<void>((resolve) => {
    releasePreparing = resolve
  })
  const preparingObserved = new Promise<void>((resolve) => {
    observePreparing = resolve
  })
  const action = {
    async prepare() {
      return {
        permissionProfile: 'workspace_write',
        skill: {
          name: 'ay-ple-first-assignment',
          path: '/workspace/.agents/skills/ay-ple-first-assignment/SKILL.md',
        },
        text: 'prepared action input',
      }
    },
    async revalidateForDispatch(_input, _prepared, context) {
      revalidationSignal = context.signal
      assert.equal(context.signal.aborted, false)
      assert.equal(frames.at(-1)?.type, 'operation.preparing')
      await context.listEffectiveSkills(context.signal)
      throw new OrganizeSourcesActionError('action_context_stale')
    },
  } satisfies OrganizeSourcesAction
  const operations = createPreparedProductOperationCoordinator({
    service: composition.service,
    organizeSourcesAction: action,
    assertWorkspaceActive: () => undefined,
    interactionRuntimeTerminal: async () => {
      runtimeTerminalCalls += 1
    },
  })

  try {
    const invocation = operations.invokeAction(
      {
        action: 'organize_sources',
        files: [{ relativePath: 'materials/notice.md' }],
      },
      {
        disconnected: () => false,
        sink: {
          async write(frame) {
            frames.push(structuredClone(frame))
            if (frame.type === 'operation.preparing') {
              observePreparing()
              await preparingReleased
            }
            return true
          },
          end: () => undefined,
        },
      },
    )
    await preparingObserved

    assert.equal(revalidationSignal, undefined)
    assert.equal(
      runtime.calls.some(
        (call) => call.operation === 'startProductTurn',
      ),
      false,
    )

    releasePreparing()
    await invocation

    assert.deepEqual(
      frames.map((frame) => frame.type),
      ['operation.preparing', 'operation.terminal'],
    )
    assert.deepEqual(frames.at(-1), {
      type: 'operation.terminal',
      operationId: frames[0]?.operationId,
      status: 'failed',
      failureCode: 'action_context_stale',
    })
    assert.equal(revalidationSignal?.aborted, true)
    assert.equal(
      runtime.calls.some(
        (call) => call.operation === 'startProductTurn',
      ),
      false,
    )
    assert.equal(runtimeTerminalCalls, 0)
  } finally {
    operations.beginShutdown()
    await composition.close()
  }
})
