import assert from 'node:assert/strict'
import test from 'node:test'

import type {
  CodexAccountReadiness,
  CodexModelCatalog,
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
  createDeferred,
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

test('a reserved Product operation reuses an in-flight account observation', async () => {
  const runtime = new DelayedAccountReadinessRuntime()
  const composition = createCodexChatComposition({
    bootstrap: {
      ...codexChatIdentity,
      createRuntime: async () => runtime,
      acquireProductThread: async () => 'thread-pre-acquired',
    },
  })

  try {
    const observedReadiness =
      composition.service.readProductAccountReadiness()
    await runtime.accountReadStarted
    const lease = composition.service.reserveProductOperation(
      'operation-account-readiness',
    )
    const operationReadiness =
      composition.service.readProductAccountReadiness(lease)

    runtime.resolveAccountReadiness()
    assert.deepEqual(await observedReadiness, expectedAccountReadiness)
    assert.deepEqual(await operationReadiness, expectedAccountReadiness)
    assert.equal(runtime.accountReadCalls, 1)
    await composition.service.releaseProductOperation(lease)
  } finally {
    runtime.resolveAccountReadiness()
    await composition.close()
  }
})

test('a reserved Product operation reuses an in-flight model catalog observation', async () => {
  const runtime = new DelayedModelCatalogRuntime()
  const composition = createCodexChatComposition({
    bootstrap: {
      ...codexChatIdentity,
      createRuntime: async () => runtime,
      acquireProductThread: async () => 'thread-pre-acquired',
    },
  })

  try {
    const observedCatalog = composition.service.readProductModelCatalog()
    await runtime.modelCatalogReadStarted
    const lease = composition.service.reserveProductOperation(
      'operation-model-catalog',
    )
    const operationCatalog =
      composition.service.readProductModelCatalog(lease)

    runtime.resolveModelCatalog()
    assert.deepEqual(await observedCatalog, expectedModelCatalog)
    assert.deepEqual(await operationCatalog, expectedModelCatalog)
    assert.equal(runtime.modelCatalogReadCalls, 1)
    await composition.service.releaseProductOperation(lease)
  } finally {
    runtime.resolveModelCatalog()
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

const expectedAccountReadiness: CodexAccountReadiness = { state: 'ready' }

class DelayedAccountReadinessRuntime extends CapturingProductRuntime {
  private readonly accountRead =
    createDeferred<CodexAccountReadiness>()
  private readonly accountReadStartedGate = createDeferred<void>()
  accountReadCalls = 0

  get accountReadStarted(): Promise<void> {
    return this.accountReadStartedGate.promise
  }

  override readAccountReadiness(): Promise<CodexAccountReadiness> {
    this.accountReadCalls += 1
    this.accountReadStartedGate.resolve()
    return this.accountRead.promise
  }

  resolveAccountReadiness(): void {
    this.accountRead.resolve(expectedAccountReadiness)
  }
}

const expectedModelCatalog: CodexModelCatalog = {
  models: [
    {
      model: 'gpt-current',
      displayName: 'GPT Current',
      description: 'Current model',
      isDefault: true,
      defaultReasoningEffort: 'medium',
      supportedReasoningEfforts: [
        { reasoningEffort: 'medium', description: 'Balanced' },
      ],
      serviceTiers: ['default'],
    },
  ],
}

class DelayedModelCatalogRuntime extends CapturingProductRuntime {
  private readonly modelCatalogRead =
    createDeferred<CodexModelCatalog>()
  private readonly modelCatalogReadStartedGate = createDeferred<void>()
  modelCatalogReadCalls = 0

  get modelCatalogReadStarted(): Promise<void> {
    return this.modelCatalogReadStartedGate.promise
  }

  override readModelCatalog(): Promise<CodexModelCatalog> {
    this.modelCatalogReadCalls += 1
    this.modelCatalogReadStartedGate.resolve()
    return this.modelCatalogRead.promise
  }

  resolveModelCatalog(): void {
    this.modelCatalogRead.resolve(expectedModelCatalog)
  }
}
