import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import {
  lstat,
  mkdir,
  mkdtemp,
  readFile,
  rm,
  writeFile,
} from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import test from 'node:test'

import {
  createSemesterWorkspaceController,
  SemesterWorkspaceError,
  StatePatchReviewError,
  type AssignmentProposalContext,
  type SemesterWorkspaceController,
} from './semester-workspace.js'
import { ASSIGNMENT_REVIEW_QUESTION } from './state-patch-review.js'

const firstSource = Buffer.from(
  '\ufeff과제 제목: 문제 해결 에세이\r\n마감: 2026-08-31T18:00:00+09:00\r\n',
  'utf8',
)
const secondSource = Buffer.from(
  '제출 방식: LMS에 PDF 업로드\n평가 기준: 근거와 구조\n',
  'utf8',
)
const managedSkillPath = '/managed/first-assignment/SKILL.md'

test('Assignment action persists starting before bind and settles after guarded staging cleanup', async () => {
  const fixture = await createFixture()
  try {
    const prepared = await prepareAction(fixture.controller, fixture.courseId)

    assert.equal(prepared.run.status, 'starting')
    assert.equal(prepared.run.requestedSkillName, 'assignment-modeling')
    assert.equal(prepared.run.requestedSkillPath, managedSkillPath)
    assert.deepEqual(await readFile(prepared.stagedSources[0]!.path), firstSource)
    assert.deepEqual(await readFile(prepared.stagedSources[1]!.path), secondSource)
    assert.equal((await lstat(prepared.scratchPath)).isDirectory(), true)
    assert.deepEqual(fixture.controller.modelingRun(prepared.run.actionId), prepared.run)

    const persisted = JSON.parse(
      await readFile(
        path.join(fixture.workspaceRoot, '.ay-ple', 'workspace-state.json'),
        'utf8',
      ),
    ) as Record<string, unknown>
    assert.equal((persisted.modelingRuns as unknown[]).length, 1)
    assert.notEqual(persisted.executionGuard, null)

    const running = await fixture.controller.bindAssignmentAction({
      actionId: prepared.run.actionId,
      threadId: 'thread-action-1',
      turnId: 'turn-action-1',
    })
    assert.equal(running.id, prepared.run.id)
    assert.equal(running.status, 'running')

    const settled = await fixture.controller.settleAssignmentAction({
      actionId: prepared.run.actionId,
      status: 'completed',
      validationOutcome: 'passed',
    })
    assert.equal(settled.id, prepared.run.id)
    assert.equal(settled.status, 'completed')
    assert.equal(await exists(prepared.stagedSources[0]!.path), false)
    assert.equal(await exists(prepared.scratchPath), false)

    const reopened = createSemesterWorkspaceController({
      packageRoot: fixture.packageRoot,
      appDataRoot: fixture.appDataRoot,
      chooseDirectory: async () => fixture.workspaceRoot,
    })
    await reopened.activate()
    assert.equal(reopened.modelingRun(prepared.run.actionId)?.status, 'completed')
  } finally {
    await fixture.cleanup()
  }
})

test('next open removes a crash-orphaned pre-commit scratch and source staging pair', async () => {
  const fixture = await createFixture()
  const actionId = `action_${'8'.repeat(32)}`
  const scratchPath = path.join(
    fixture.workspaceRoot,
    '.ay-ple',
    'runtime-scratch',
    actionId,
  )
  const stagingPath = path.join(
    fixture.appDataRoot,
    'assignment-runs',
    actionId,
  )
  try {
    await mkdir(scratchPath, { recursive: true })
    await mkdir(stagingPath, { recursive: true })
    await writeFile(path.join(stagingPath, 'source-1.txt'), firstSource)

    const reopened = createSemesterWorkspaceController({
      packageRoot: fixture.packageRoot,
      appDataRoot: fixture.appDataRoot,
      chooseDirectory: async () => fixture.workspaceRoot,
    })
    await reopened.activate()

    assert.deepEqual(reopened.modelingRuns(), [])
    assert.equal(await exists(scratchPath), false)
    assert.equal(await exists(stagingPath), false)
  } finally {
    await fixture.cleanup()
  }
})

test('cleanup deadline leaves a recovery guard and a later open can finish cleanup', async () => {
  let releaseCleanup!: () => void
  const cleanupBarrier = new Promise<void>((resolve) => {
    releaseCleanup = resolve
  })
  const fixture = await createFixture(undefined, {
    actionCleanupDeadlineMs: 5,
    beforeActionArtifactCleanup: () => cleanupBarrier,
  })
  try {
    const prepared = await prepareAction(fixture.controller, fixture.courseId)
    await fixture.controller.bindAssignmentAction({
      actionId: prepared.run.actionId,
      threadId: 'thread-cleanup-deadline',
      turnId: 'turn-cleanup-deadline',
    })

    const startedAt = Date.now()
    const settled = await fixture.controller.settleAssignmentAction({
      actionId: prepared.run.actionId,
      status: 'completed',
      validationOutcome: 'passed',
    })

    assert.equal(settled.status, 'completed')
    assert.equal(Date.now() - startedAt < 250, true)
    assert.equal(
      fixture.controller.executionGuardRequiresFreshRuntime(
        prepared.run.actionId,
      ),
      true,
    )
    await assert.rejects(
      prepareAction(
        fixture.controller,
        fixture.courseId,
        `action_${'9'.repeat(32)}`,
      ),
      (error: unknown) =>
        error instanceof SemesterWorkspaceError &&
        error.code === 'execution_cleanup_required',
    )

    releaseCleanup()
    const reopened = createSemesterWorkspaceController({
      packageRoot: fixture.packageRoot,
      appDataRoot: fixture.appDataRoot,
      chooseDirectory: async () => fixture.workspaceRoot,
    })
    await reopened.activate()
    assert.equal(
      reopened.executionGuardRequiresFreshRuntime(prepared.run.actionId),
      false,
    )
    assert.equal(await exists(prepared.scratchPath), false)
  } finally {
    releaseCleanup()
    await fixture.cleanup()
  }
})

test('invalid action admission leaves no Run, staging, or scratch', async () => {
  const fixture = await createFixture()
  try {
    const snapshot = fixture.controller.snapshot()
    assert.equal(snapshot?.state, 'ready')
    if (snapshot?.state !== 'ready') assert.fail('workspace must be ready')
    const selected = snapshot.materials[0]!
    const actionId = `action_${'c'.repeat(32)}`
    await assert.rejects(
      fixture.controller.prepareAssignmentAction({
        actionId,
        courseId: fixture.courseId,
        recipe: {
          name: 'first-assignment',
          version: '1.0.0',
          digest: sha256('managed recipe bytes'),
          requestedSkillName: 'assignment-modeling',
          requestedSkillPath: managedSkillPath,
        },
        arguments: {
          canonical: '{}',
          digest: sha256('not-the-canonical-arguments'),
        },
        selectedMaterials: [
          { rawMaterialId: selected.id, digest: selected.digest },
        ],
      }),
      (error: unknown) =>
        error instanceof SemesterWorkspaceError &&
        error.code === 'action_invalid',
    )
    assert.deepEqual(fixture.controller.modelingRuns(), [])
    assert.equal(
      await exists(
        path.join(fixture.appDataRoot, 'assignment-runs', actionId),
      ),
      false,
    )
    assert.equal(
      await exists(
        path.join(
          fixture.workspaceRoot,
          '.ay-ple',
          'runtime-scratch',
          actionId,
        ),
      ),
      false,
    )
  } finally {
    await fixture.cleanup()
  }
})

test('activation reconciles an unfinished action and its pending patch before material refresh', async () => {
  const fixture = await createFixture()
  try {
    const prepared = await prepareAction(fixture.controller, fixture.courseId)
    await fixture.controller.bindAssignmentAction({
      actionId: prepared.run.actionId,
      threadId: 'thread-action-2',
      turnId: 'turn-action-2',
    })
    const patch = await prepared.mcpTool.invoke(
      validProposalPayload(prepared.context),
    )
    assert.equal(patch.status, 'pending')

    const reopened = createSemesterWorkspaceController({
      packageRoot: fixture.packageRoot,
      appDataRoot: fixture.appDataRoot,
      chooseDirectory: async () => fixture.workspaceRoot,
    })
    await reopened.activate()

    const reconciled = reopened.modelingRun(prepared.run.actionId)
    assert.equal(reconciled?.id, prepared.run.id)
    assert.equal(reconciled?.status, 'unknown')
    assert.equal(reconciled?.failureCode, 'reconciled_after_restart')
    assert.deepEqual(reconciled?.recoveryOutcome, { outcome: 'unknown' })
    assert.equal(
      reopened
        .assignmentState()
        .statePatches.find((candidate) => candidate.id === patch.id)?.status,
      'interrupted',
    )
    assert.equal(await exists(prepared.stagedSources[0]!.path), false)
    assert.equal(await exists(prepared.scratchPath), false)
  } finally {
    await fixture.cleanup()
  }
})

for (const decision of ['accept', 'reject'] as const) {
  test(`activation preserves an atomic ${decision} decision as continuation loss across repeated reopen`, async () => {
    const fixture = await createFixture()
    try {
      const prepared = await prepareAction(fixture.controller, fixture.courseId)
      await fixture.controller.bindAssignmentAction({
        actionId: prepared.run.actionId,
        threadId: `thread-restart-after-${decision}`,
        turnId: `turn-restart-after-${decision}`,
      })
      const patch = await prepared.mcpTool.invoke(
        validProposalPayload(prepared.context),
      )
      const review = await fixture.controller.bindAssignmentReview({
        type: 'user_input.requested',
        threadId: `thread-restart-after-${decision}`,
        turnId: `turn-restart-after-${decision}`,
        itemId: `item-restart-after-${decision}`,
        interactionId: `interaction-restart-after-${decision}`,
        questions: [ASSIGNMENT_REVIEW_QUESTION],
      })
      assert.ok(review)
      const committed =
        await fixture.controller.commitAssignmentReviewDecision({
          ...review,
          decision,
        })
      const expectedRevision = committed.confirmedRevision

      const firstReopen = createSemesterWorkspaceController({
        packageRoot: fixture.packageRoot,
        appDataRoot: fixture.appDataRoot,
        chooseDirectory: async () => fixture.workspaceRoot,
      })
      const firstActivation = await firstReopen.activate()
      assert.equal(firstActivation.status, 'activated')
      const firstRun = firstReopen.modelingRun(prepared.run.actionId)
      assert.equal(firstRun?.status, 'unknown')
      assert.deepEqual(firstRun?.recoveryOutcome, {
        outcome: 'continuation_lost',
        confirmedRevision: expectedRevision,
      })
      const firstState = firstReopen.assignmentState()
      assert.equal(firstState.statePatches[0]?.id, patch.id)
      assert.equal(
        firstState.statePatches[0]?.status,
        decision === 'accept' ? 'applied' : 'rejected',
      )
      assert.equal(firstState.userConfirmations.length, 1)
      assert.equal(firstState.assignments.length, decision === 'accept' ? 1 : 0)

      const secondReopen = createSemesterWorkspaceController({
        packageRoot: fixture.packageRoot,
        appDataRoot: fixture.appDataRoot,
        chooseDirectory: async () => fixture.workspaceRoot,
      })
      const secondActivation = await secondReopen.activate()
      assert.equal(secondActivation.status, 'activated')
      assert.deepEqual(
        secondReopen.modelingRun(prepared.run.actionId),
        firstRun,
      )
      const secondState = secondReopen.assignmentState()
      assert.deepEqual(
        secondState.userConfirmations,
        firstState.userConfirmations,
      )
      assert.deepEqual(secondState.assignments, firstState.assignments)
      assert.deepEqual(secondState.statePatches, firstState.statePatches)
    } finally {
      await fixture.cleanup()
    }
  })
}

test('acceptance-unknown keeps one guard and reconciles without creating a second Run', async () => {
  const fixture = await createFixture()
  try {
    const prepared = await prepareAction(fixture.controller, fixture.courseId)
    const uncertain = await fixture.controller.failAssignmentActionStart({
      actionId: prepared.run.actionId,
      status: 'acceptance_unknown',
      failureCode: 'native_acceptance_unknown',
    })
    assert.equal(uncertain.status, 'acceptance_unknown')

    const reopened = createSemesterWorkspaceController({
      packageRoot: fixture.packageRoot,
      appDataRoot: fixture.appDataRoot,
      chooseDirectory: async () => fixture.workspaceRoot,
    })
    await reopened.activate()
    assert.equal(reopened.modelingRuns().length, 1)
    assert.equal(reopened.modelingRun(prepared.run.actionId)?.id, prepared.run.id)
    assert.equal(
      reopened.modelingRun(prepared.run.actionId)?.status,
      'unknown',
    )
    assert.equal(await exists(prepared.scratchPath), false)
  } finally {
    await fixture.cleanup()
  }
})

test('source drift preserves user bytes until explicit refresh adopts a new baseline', async () => {
  const fixture = await createFixture()
  try {
    const before = fixture.controller.snapshot()
    assert.equal(before?.state, 'ready')
    if (before?.state !== 'ready') assert.fail('workspace must be ready')
    const firstMaterial = before.materials.find(
      (material) => material.relativePath === 'first.txt',
    )!
    const prepared = await prepareAction(fixture.controller, fixture.courseId)
    await fixture.controller.bindAssignmentAction({
      actionId: prepared.run.actionId,
      threadId: 'thread-action-3',
      turnId: 'turn-action-3',
    })
    const driftedBytes = Buffer.from('학생이 실행 중 원본을 수정함', 'utf8')
    const firstPath = path.join(fixture.workspaceRoot, 'first.txt')
    await writeFile(firstPath, driftedBytes)

    await assert.rejects(
      prepared.mcpTool.invoke({}),
      (error: unknown) =>
        error instanceof SemesterWorkspaceError &&
        error.code === 'execution_guard_conflict',
    )
    const settled = await fixture.controller.settleAssignmentAction({
      actionId: prepared.run.actionId,
      status: 'completed',
      validationOutcome: 'passed',
    })
    assert.equal(settled.status, 'failed')
    assert.equal(settled.validationOutcome, 'failed')
    assert.equal(settled.failureCode, 'execution_guard_conflict')
    assert.deepEqual(await readFile(firstPath), driftedBytes)
    const recoverySnapshot = fixture.controller.snapshot()
    assert.equal(recoverySnapshot?.state, 'ready')
    if (recoverySnapshot?.state !== 'ready') {
      assert.fail('workspace must be ready')
    }
    assert.deepEqual(recoverySnapshot.recovery, {
      state: 'source_conflict',
      displayMessage:
        '원본 자료가 실행 중 변경되었습니다. 자료 새로고침으로 현재 내용을 새 기준으로 채택하세요.',
    })
    await assert.rejects(
      prepareAction(
        fixture.controller,
        fixture.courseId,
        `action_${'b'.repeat(32)}`,
      ),
      (error: unknown) =>
        error instanceof SemesterWorkspaceError &&
        error.code === 'execution_cleanup_required',
    )

    const refreshed = await fixture.controller.refreshMaterials()
    assert.equal(refreshed.outcome, 'source_rebaselined')
    assert.equal(refreshed.workspace.recovery, null)
    const refreshedFirst = refreshed.workspace.materials.find(
      (material) => material.relativePath === 'first.txt',
    )!
    assert.equal(refreshedFirst.id, firstMaterial.id)
    assert.equal(
      refreshedFirst.digest,
      createHash('sha256').update(driftedBytes).digest('hex'),
    )
    assert.deepEqual(await readFile(firstPath), driftedBytes)
    assert.equal(await exists(prepared.stagedSources[0]!.path), false)
    assert.equal(await exists(prepared.scratchPath), false)

    const fresh = await prepareAction(
      fixture.controller,
      fixture.courseId,
      `action_${'b'.repeat(32)}`,
    )
    await fixture.controller.failAssignmentActionStart({
      actionId: fresh.run.actionId,
      status: 'not_accepted',
      failureCode: 'test_cleanup',
    })
  } finally {
    await fixture.cleanup()
  }
})

test('source rebaseline remains blocked until bounded artifact cleanup succeeds', async () => {
  let releaseCleanup!: () => void
  const cleanupBarrier = new Promise<void>((resolve) => {
    releaseCleanup = resolve
  })
  const fixture = await createFixture(undefined, {
    actionCleanupDeadlineMs: 5,
    beforeActionArtifactCleanup: () => cleanupBarrier,
  })
  try {
    const baseline = fixture.controller.snapshot()
    assert.equal(baseline?.state, 'ready')
    if (baseline?.state !== 'ready') assert.fail('workspace must be ready')
    const baselineDigest = baseline.materials[0]!.digest
    const prepared = await prepareAction(fixture.controller, fixture.courseId)
    await fixture.controller.bindAssignmentAction({
      actionId: prepared.run.actionId,
      threadId: 'thread-source-cleanup',
      turnId: 'turn-source-cleanup',
    })
    await writeFile(
      path.join(fixture.workspaceRoot, baseline.materials[0]!.relativePath),
      'cleanup 뒤에만 채택할 원본',
      'utf8',
    )
    await fixture.controller.settleAssignmentAction({
      actionId: prepared.run.actionId,
      status: 'interrupted',
      validationOutcome: 'failed',
    })

    await assert.rejects(
      fixture.controller.refreshMaterials(),
      (error: unknown) =>
        error instanceof SemesterWorkspaceError &&
        error.code === 'execution_cleanup_required',
    )
    const blocked = fixture.controller.snapshot()
    assert.equal(blocked?.state, 'ready')
    if (blocked?.state !== 'ready') assert.fail('workspace must be ready')
    assert.equal(blocked.recovery?.state, 'source_conflict')
    assert.equal(blocked.materials[0]!.digest, baselineDigest)

    releaseCleanup()
    const refreshed = await fixture.controller.refreshMaterials()
    assert.equal(refreshed.outcome, 'source_rebaselined')
    assert.equal(refreshed.workspace.recovery, null)
  } finally {
    releaseCleanup()
    await fixture.cleanup()
  }
})

test('external product-store drift is never overwritten while an action settles', async () => {
  const fixture = await createFixture()
  try {
    const prepared = await prepareAction(fixture.controller, fixture.courseId)
    await fixture.controller.bindAssignmentAction({
      actionId: prepared.run.actionId,
      threadId: 'thread-store-drift',
      turnId: 'turn-store-drift',
    })
    const storePath = path.join(
      fixture.workspaceRoot,
      '.ay-ple',
      'workspace-state.json',
    )
    const externalBytes = Buffer.from('{"external":"preserve exactly"}\n')
    await writeFile(storePath, externalBytes)

    await assert.rejects(
      fixture.controller.settleAssignmentAction({
        actionId: prepared.run.actionId,
        status: 'completed',
        validationOutcome: 'passed',
      }),
      (error: unknown) =>
        error instanceof SemesterWorkspaceError &&
        error.code === 'execution_guard_conflict',
    )
    assert.deepEqual(await readFile(storePath), externalBytes)
  } finally {
    await fixture.cleanup()
  }
})

test('store drift after guard validation still blocks the atomic settlement replace', async () => {
  let storePath = ''
  const externalBytes = Buffer.from('{"external":"late preserve"}\n', 'utf8')
  const fixture = await createFixture(async (point) => {
    if (point === 'settle') await writeFile(storePath, externalBytes)
  })
  storePath = path.join(
    fixture.workspaceRoot,
    '.ay-ple',
    'workspace-state.json',
  )
  try {
    const prepared = await prepareAction(fixture.controller, fixture.courseId)
    await fixture.controller.bindAssignmentAction({
      actionId: prepared.run.actionId,
      threadId: 'thread-store-late-drift',
      turnId: 'turn-store-late-drift',
    })

    await assert.rejects(
      fixture.controller.settleAssignmentAction({
        actionId: prepared.run.actionId,
        status: 'completed',
        validationOutcome: 'passed',
      }),
      (error: unknown) =>
        error instanceof SemesterWorkspaceError &&
        error.code === 'execution_guard_conflict',
    )
    assert.deepEqual(await readFile(storePath), externalBytes)
    const conflicted = fixture.controller.snapshot()
    assert.equal(conflicted?.state, 'ready')
    if (conflicted?.state !== 'ready') assert.fail('workspace must be ready')
    assert.equal(conflicted.recovery?.state, 'store_conflict')
  } finally {
    await fixture.cleanup()
  }
})

test('an unreviewed action proposal becomes interrupted at terminal settlement', async () => {
  const fixture = await createFixture()
  try {
    const prepared = await prepareAction(fixture.controller, fixture.courseId)
    await fixture.controller.bindAssignmentAction({
      actionId: prepared.run.actionId,
      threadId: 'thread-unreviewed-action',
      turnId: 'turn-unreviewed-action',
    })
    const patch = await prepared.mcpTool.invoke(
      validProposalPayload(prepared.context),
    )
    assert.equal(patch.status, 'pending')

    await fixture.controller.settleAssignmentAction({
      actionId: prepared.run.actionId,
      status: 'failed',
      validationOutcome: 'passed',
      failureCode: 'turn_failed',
    })
    assert.equal(
      fixture.controller
        .assignmentState()
        .statePatches.find((candidate) => candidate.id === patch.id)?.status,
      'interrupted',
    )
  } finally {
    await fixture.cleanup()
  }
})

test('terminal settlement releases a settled Review binding before native interaction ID reuse', async () => {
  const fixture = await createFixture()
  const interactionId = 'interaction-reused-after-terminal'
  try {
    const first = await prepareAction(fixture.controller, fixture.courseId)
    await fixture.controller.bindAssignmentAction({
      actionId: first.run.actionId,
      threadId: 'thread-review-release-1',
      turnId: 'turn-review-release-1',
    })
    const firstPatch = await first.mcpTool.invoke(
      validProposalPayload(first.context),
    )
    const firstBinding = await fixture.controller.bindAssignmentReview({
      type: 'user_input.requested',
      threadId: 'thread-review-release-1',
      turnId: 'turn-review-release-1',
      itemId: 'item-review-release-1',
      interactionId,
      questions: [ASSIGNMENT_REVIEW_QUESTION],
    })
    assert.ok(firstBinding)
    await fixture.controller.commitAssignmentReviewDecision({
      ...firstBinding,
      decision: 'accept',
    })
    await fixture.controller.settleAssignmentAction({
      actionId: first.run.actionId,
      status: 'completed',
      validationOutcome: 'passed',
    })

    const second = await prepareAction(
      fixture.controller,
      fixture.courseId,
      `action_${'7'.repeat(32)}`,
    )
    await fixture.controller.bindAssignmentAction({
      actionId: second.run.actionId,
      threadId: 'thread-review-release-2',
      turnId: 'turn-review-release-2',
    })
    const secondPatch = await second.mcpTool.invoke(
      validProposalPayload(second.context),
    )
    const secondBinding = await fixture.controller.bindAssignmentReview({
      type: 'user_input.requested',
      threadId: 'thread-review-release-2',
      turnId: 'turn-review-release-2',
      itemId: 'item-review-release-2',
      interactionId,
      questions: [ASSIGNMENT_REVIEW_QUESTION],
    })

    assert.ok(secondBinding)
    assert.equal(secondBinding.interactionId, interactionId)
    assert.notEqual(secondPatch.id, firstPatch.id)
  } finally {
    await fixture.cleanup()
  }
})

test('free-form proposal context is Run-free, runtime-unbound, bindable, and releasable', async () => {
  const fixture = await createFixture()
  try {
    const material = fixture.controller.snapshot()
    assert.equal(material?.state, 'ready')
    if (material?.state !== 'ready') assert.fail('workspace must be ready')
    const selected = material.materials[0]!
    const session = await fixture.controller.prepareAssignmentProposalSession({
      courseId: fixture.courseId,
      selectedMaterials: [
        { rawMaterialId: selected.id, digest: selected.digest },
      ],
    })
    assert.deepEqual(fixture.controller.modelingRuns(), [])
    await assert.rejects(
      session.mcpTool.invoke({}),
      (error: unknown) =>
        error instanceof StatePatchReviewError &&
        error.code === 'proposal_context_invalid',
    )

    await fixture.controller.bindAssignmentProposalSession({
      requestKey: session.context.requestKey,
      threadId: 'thread-chat-1',
      turnId: 'turn-chat-1',
    })
    const patch = await session.mcpTool.invoke({
      requestKey: session.context.requestKey,
      workspaceId: session.context.workspaceId,
      courseId: session.context.courseId,
      baseRevision: session.context.baseRevision,
      summary: '과제 공지를 구조화합니다.',
      changes: {
        operation: 'assignment.upsert',
        values: {
          title: '문제 해결 에세이',
          dueAt: '2026-08-31T18:00:00+09:00',
          submissionMethod: '공지에서 확인',
        },
      },
      evidence: [
        {
          field: 'title',
          rawMaterialId: selected.id,
          digest: selected.digest,
          quote: '과제 제목: 문제 해결 에세이',
        },
        {
          field: 'dueAt',
          rawMaterialId: selected.id,
          digest: selected.digest,
          quote: '마감: 2026-08-31T18:00:00+09:00',
        },
        {
          field: 'submissionMethod',
          rawMaterialId: selected.id,
          digest: selected.digest,
          quote: '과제 제목',
        },
      ],
    })
    assert.equal(patch.status, 'pending')
    assert.deepEqual(fixture.controller.modelingRuns(), [])

    await fixture.controller.releaseAssignmentProposalSession(
      session.context.requestKey,
    )
    await assert.rejects(
      session.mcpTool.invoke({}),
      (error: unknown) =>
        error instanceof StatePatchReviewError &&
        error.code === 'proposal_context_invalid',
    )
  } finally {
    await fixture.cleanup()
  }
})

test('Run-free Product Chat holds the durable source/revision guard through bind and settlement', async () => {
  const fixture = await createFixture()
  try {
    const operationId = `chat_${'d'.repeat(32)}`
    const prepared = await fixture.controller.prepareProductChatExecution({
      operationId,
      courseId: fixture.courseId,
      selectedMaterials: [],
    })
    assert.equal((await lstat(prepared.scratchPath)).isDirectory(), true)
    assert.deepEqual(fixture.controller.modelingRuns(), [])
    await assert.rejects(
      fixture.controller.refreshMaterials(),
      (error: unknown) =>
        error instanceof SemesterWorkspaceError &&
        error.code === 'action_active',
    )
    await assert.rejects(
      fixture.controller.activate(),
      (error: unknown) =>
        error instanceof SemesterWorkspaceError &&
        error.code === 'action_active',
    )

    await fixture.controller.bindProductChatExecution({
      operationId,
      threadId: 'thread-chat-guard',
      turnId: 'turn-chat-guard',
    })
    await fixture.controller.settleProductChatExecution({ operationId })
    assert.equal(await exists(prepared.scratchPath), false)
    assert.deepEqual(fixture.controller.modelingRuns(), [])
    await fixture.controller.refreshMaterials()
  } finally {
    await fixture.cleanup()
  }
})

test('Product Chat guard ignores an unregistered transient TXT while preserving registered sources', async () => {
  const fixture = await createFixture()
  try {
    const operationId = `chat_${'9'.repeat(32)}`
    const prepared = await fixture.controller.prepareProductChatExecution({
      operationId,
      courseId: fixture.courseId,
      selectedMaterials: [],
    })
    await writeFile(
      path.join(fixture.workspaceRoot, 'native-output.txt'),
      '등록되지 않은 실행 중간 산출물',
      'utf8',
    )

    await fixture.controller.bindProductChatExecution({
      operationId,
      threadId: 'thread-chat-transient-output',
      turnId: 'turn-chat-transient-output',
    })
    await fixture.controller.settleProductChatExecution({ operationId })

    assert.equal(await exists(prepared.scratchPath), false)
    assert.deepEqual(fixture.controller.modelingRuns(), [])
    assert.equal(
      await readFile(
        path.join(fixture.workspaceRoot, 'native-output.txt'),
        'utf8',
      ),
      '등록되지 않은 실행 중간 산출물',
    )
  } finally {
    await fixture.cleanup()
  }
})

test('an unreviewed Run-free Chat proposal becomes interrupted at settlement', async () => {
  const fixture = await createFixture()
  try {
    const snapshot = fixture.controller.snapshot()
    assert.equal(snapshot?.state, 'ready')
    if (snapshot?.state !== 'ready') assert.fail('workspace must be ready')
    const selectedMaterials = snapshot.materials.map((material) => ({
      rawMaterialId: material.id,
      digest: material.digest,
    }))
    const operationId = `chat_${'3'.repeat(32)}`
    await fixture.controller.prepareProductChatExecution({
      operationId,
      courseId: fixture.courseId,
      selectedMaterials,
    })
    const proposal = await fixture.controller.prepareAssignmentProposalSession({
      courseId: fixture.courseId,
      selectedMaterials,
    })
    await fixture.controller.bindProductChatExecution({
      operationId,
      threadId: 'thread-unreviewed-chat',
      turnId: 'turn-unreviewed-chat',
    })
    await fixture.controller.bindAssignmentProposalSession({
      requestKey: proposal.context.requestKey,
      threadId: 'thread-unreviewed-chat',
      turnId: 'turn-unreviewed-chat',
    })
    const patch = await proposal.mcpTool.invoke(
      validProposalPayload(proposal.context),
    )
    assert.equal(patch.status, 'pending')

    await fixture.controller.settleProductChatExecution({ operationId })
    assert.equal(
      fixture.controller
        .assignmentState()
        .statePatches.find((candidate) => candidate.id === patch.id)?.status,
      'interrupted',
    )
    assert.deepEqual(fixture.controller.modelingRuns(), [])
  } finally {
    await fixture.cleanup()
  }
})

test('Product Chat guards all registered sources and restart reconciles an unfinished no-Run guard', async () => {
  const fixture = await createFixture()
  try {
    const operationId = `chat_${'e'.repeat(32)}`
    const prepared = await fixture.controller.prepareProductChatExecution({
      operationId,
      courseId: fixture.courseId,
      selectedMaterials: [],
    })
    await writeFile(
      path.join(fixture.workspaceRoot, 'second.txt'),
      'Chat 실행 중 바뀐 등록 자료',
      'utf8',
    )
    await assert.rejects(
      fixture.controller.bindProductChatExecution({
        operationId,
        threadId: 'thread-chat-drift',
        turnId: 'turn-chat-drift',
      }),
      (error: unknown) =>
        error instanceof SemesterWorkspaceError &&
        error.code === 'execution_guard_conflict',
    )
    await assert.rejects(
      fixture.controller.settleProductChatExecution({ operationId }),
      (error: unknown) =>
        error instanceof SemesterWorkspaceError &&
        error.code === 'execution_guard_conflict',
    )
    assert.equal(await exists(prepared.scratchPath), false)
    await assert.rejects(
      fixture.controller.prepareProductChatExecution({
        operationId: `chat_${'f'.repeat(32)}`,
        courseId: fixture.courseId,
        selectedMaterials: [],
      }),
      (error: unknown) =>
        error instanceof SemesterWorkspaceError &&
        error.code === 'execution_cleanup_required',
    )
  } finally {
    await fixture.cleanup()
  }

  const reopenFixture = await createFixture()
  try {
    const operationId = `chat_${'1'.repeat(32)}`
    const snapshot = reopenFixture.controller.snapshot()
    assert.equal(snapshot?.state, 'ready')
    if (snapshot?.state !== 'ready') assert.fail('workspace must be ready')
    const selectedMaterials = snapshot.materials.map((material) => ({
      rawMaterialId: material.id,
      digest: material.digest,
    }))
    const prepared = await reopenFixture.controller.prepareProductChatExecution({
      operationId,
      courseId: reopenFixture.courseId,
      selectedMaterials,
    })
    const proposal =
      await reopenFixture.controller.prepareAssignmentProposalSession({
        courseId: reopenFixture.courseId,
        selectedMaterials,
      })
    await reopenFixture.controller.bindProductChatExecution({
      operationId,
      threadId: 'thread-chat-restart',
      turnId: 'turn-chat-restart',
    })
    await reopenFixture.controller.bindAssignmentProposalSession({
      requestKey: proposal.context.requestKey,
      threadId: 'thread-chat-restart',
      turnId: 'turn-chat-restart',
    })
    const patch = await proposal.mcpTool.invoke(
      validProposalPayload(proposal.context),
    )
    assert.equal(patch.status, 'pending')
    const reopened = createSemesterWorkspaceController({
      packageRoot: reopenFixture.packageRoot,
      appDataRoot: reopenFixture.appDataRoot,
      chooseDirectory: async () => reopenFixture.workspaceRoot,
    })
    await reopened.activate()
    assert.equal(await exists(prepared.scratchPath), false)
    assert.deepEqual(reopened.modelingRuns(), [])
    assert.equal(
      reopened
        .assignmentState()
        .statePatches.find((candidate) => candidate.id === patch.id)?.status,
      'interrupted',
    )
    await reopened.prepareProductChatExecution({
      operationId: `chat_${'2'.repeat(32)}`,
      courseId: reopenFixture.courseId,
      selectedMaterials: [],
    })
  } finally {
    await reopenFixture.cleanup()
  }
})

test('action transition fault hooks fail before each requested durable write', async () => {
  const points = [
    'prepare',
    'bind',
    'start_failure',
    'settle',
  ] as const
  for (const point of points) {
    let failAt: (typeof points)[number] | undefined = point
    const observed: string[] = []
    const fixture = await createFixture(async (candidate) => {
      observed.push(candidate)
      if (candidate === failAt) throw new Error(`fault:${candidate}`)
    })
    try {
      if (point === 'prepare') {
        await assert.rejects(
          prepareAction(fixture.controller, fixture.courseId),
          /fault:prepare/,
        )
        assert.deepEqual(fixture.controller.modelingRuns(), [])
        continue
      }
      const prepared = await prepareAction(fixture.controller, fixture.courseId)
      if (point === 'bind') {
        await assert.rejects(
          fixture.controller.bindAssignmentAction({
            actionId: prepared.run.actionId,
            threadId: 'thread-fault-bind',
            turnId: 'turn-fault-bind',
          }),
          /fault:bind/,
        )
        assert.equal(
          fixture.controller.modelingRun(prepared.run.actionId)?.status,
          'starting',
        )
        failAt = undefined
        await fixture.controller.failAssignmentActionStart({
          actionId: prepared.run.actionId,
          status: 'not_accepted',
          failureCode: 'test_cleanup',
        })
      } else if (point === 'start_failure') {
        await assert.rejects(
          fixture.controller.failAssignmentActionStart({
            actionId: prepared.run.actionId,
            status: 'not_accepted',
            failureCode: 'test_failure',
          }),
          /fault:start_failure/,
        )
        assert.equal(
          fixture.controller.modelingRun(prepared.run.actionId)?.status,
          'starting',
        )
        failAt = undefined
        await fixture.controller.failAssignmentActionStart({
          actionId: prepared.run.actionId,
          status: 'not_accepted',
          failureCode: 'test_cleanup',
        })
      } else {
        await fixture.controller.bindAssignmentAction({
          actionId: prepared.run.actionId,
          threadId: 'thread-fault-settle',
          turnId: 'turn-fault-settle',
        })
        await assert.rejects(
          fixture.controller.settleAssignmentAction({
            actionId: prepared.run.actionId,
            status: 'completed',
            validationOutcome: 'passed',
          }),
          /fault:settle/,
        )
        assert.equal(
          fixture.controller.modelingRun(prepared.run.actionId)?.status,
          'running',
        )
        failAt = undefined
        await fixture.controller.settleAssignmentAction({
          actionId: prepared.run.actionId,
          status: 'completed',
          validationOutcome: 'passed',
        })
      }
      assert.equal(observed.includes(point), true)
    } finally {
      await fixture.cleanup()
    }
  }
})

async function createFixture(
  beforeActionStoreWrite?: (
    point: 'prepare' | 'bind' | 'start_failure' | 'settle',
  ) => void | Promise<void>,
  cleanupOptions: {
    readonly actionCleanupDeadlineMs?: number
    readonly beforeActionArtifactCleanup?: () => void | Promise<void>
  } = {},
): Promise<{
  readonly controller: SemesterWorkspaceController
  readonly courseId: string
  readonly packageRoot: string
  readonly appDataRoot: string
  readonly workspaceRoot: string
  cleanup(): Promise<void>
}> {
  const root = await mkdtemp(path.join(tmpdir(), 'ay-ple-action-store-test-'))
  const packageRoot = path.join(root, 'package')
  const appDataRoot = path.join(root, 'app-data')
  const workspaceRoot = path.join(root, 'semester')
  await Promise.all(
    [packageRoot, appDataRoot, workspaceRoot].map((directory) =>
      mkdir(directory),
    ),
  )
  await Promise.all([
    writeFile(path.join(workspaceRoot, 'first.txt'), firstSource),
    writeFile(path.join(workspaceRoot, 'second.txt'), secondSource),
  ])
  const controller = createSemesterWorkspaceController({
    packageRoot,
    appDataRoot,
    beforeActionStoreWrite,
    ...cleanupOptions,
    chooseDirectory: async () => workspaceRoot,
  })
  await controller.activate()
  const course = await controller.createCourse('문제해결글쓰기')
  return {
    controller,
    courseId: course.course!.id,
    packageRoot,
    appDataRoot,
    workspaceRoot,
    cleanup: () => rm(root, { force: true, recursive: true }),
  }
}

async function prepareAction(
  controller: SemesterWorkspaceController,
  courseId: string,
  actionId = `action_${'a'.repeat(32)}`,
) {
  const snapshot = controller.snapshot()
  assert.equal(snapshot?.state, 'ready')
  if (snapshot?.state !== 'ready') assert.fail('workspace must be ready')
  const selectedMaterials = snapshot.materials.map((material) => ({
    rawMaterialId: material.id,
    digest: material.digest,
  }))
  const canonical = JSON.stringify({ tone: 'formal' })
  return controller.prepareAssignmentAction({
    actionId,
    courseId,
    recipe: {
      name: 'first-assignment',
      version: '1.0.0',
      digest: sha256('managed recipe bytes'),
      requestedSkillName: 'assignment-modeling',
      requestedSkillPath: managedSkillPath,
    },
    arguments: {
      canonical,
      digest: sha256(canonical),
    },
    selectedMaterials,
  })
}

function sha256(value: string): string {
  return createHash('sha256').update(value, 'utf8').digest('hex')
}

function validProposalPayload(context: AssignmentProposalContext) {
  const first = context.selectedMaterials[0]!
  const second = context.selectedMaterials[1]!
  return {
    requestKey: context.requestKey,
    workspaceId: context.workspaceId,
    courseId: context.courseId,
    baseRevision: context.baseRevision,
    summary: '과제 공지를 구조화합니다.',
    changes: {
      operation: 'assignment.upsert',
      values: {
        title: '문제 해결 에세이',
        dueAt: '2026-08-31T18:00:00+09:00',
        submissionMethod: 'LMS에 PDF 업로드',
      },
    },
    evidence: [
      {
        field: 'title',
        rawMaterialId: first.rawMaterialId,
        digest: first.digest,
        quote: '과제 제목: 문제 해결 에세이',
      },
      {
        field: 'dueAt',
        rawMaterialId: first.rawMaterialId,
        digest: first.digest,
        quote: '마감: 2026-08-31T18:00:00+09:00',
      },
      {
        field: 'submissionMethod',
        rawMaterialId: second.rawMaterialId,
        digest: second.digest,
        quote: '제출 방식: LMS에 PDF 업로드',
      },
    ],
  }
}

async function exists(candidate: string): Promise<boolean> {
  try {
    await lstat(candidate)
    return true
  } catch {
    return false
  }
}
