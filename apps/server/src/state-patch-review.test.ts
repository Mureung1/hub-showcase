import assert from 'node:assert/strict'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import test from 'node:test'

import { DeterministicCodexProductRuntime } from '@ay-ple/codex-chat-runtime/testing'

import {
  createSemesterWorkspaceController,
  SemesterWorkspaceError,
  StatePatchReviewError,
} from './semester-workspace.js'
import {
  ASSIGNMENT_REVIEW_QUESTION,
  createAssignmentReviewCoordinator,
} from './state-patch-review.js'
import { materializeE2eSemesterWorkspace } from '../../../scripts/semester-workspace-materializer.mjs'

test('a selected-source proposal creates one durable pending Assignment patch without changing confirmed state', async () => {
  const materialized = await materializeE2eSemesterWorkspace()
  const packageRoot = path.join(materialized.runRoot, 'package')
  const appDataRoot = path.join(materialized.runRoot, 'app-data')

  try {
    await Promise.all([packageRoot, appDataRoot].map((root) => mkdir(root)))
    const controller = createSemesterWorkspaceController({
      packageRoot,
      appDataRoot,
      chooseDirectory: async () => materialized.workspaceRoot,
    })
    const activated = await controller.activate()
    assert.equal(activated.status, 'activated')
    assert.equal(activated.workspace.state, 'ready')
    const workspace = await controller.createCourse('문제해결글쓰기')
    assert.ok(workspace.course)
    const notice = requireMaterial(workspace, 'lms-outline-notice.txt')
    const syllabus = requireMaterial(
      workspace,
      'problem-solving-syllabus.txt',
    )
    const session = await controller.createAssignmentProposalSession({
      courseId: workspace.course.id,
      selectedMaterials: [
        { rawMaterialId: notice.id, digest: notice.digest },
        { rawMaterialId: syllabus.id, digest: syllabus.digest },
      ],
      runtime: { threadId: 'thread-A', turnId: 'turn-A' },
    })

    assert.equal(session.mcpTool.name, 'propose_state_patch')
    assert.match(session.context.requestKey, /^proposal_[0-9a-f]{32}$/)
    assert.match(session.context.workspaceId, /^workspace_[0-9a-f]{32}$/)
    assert.equal(session.context.courseId, workspace.course.id)
    assert.equal(session.context.baseRevision, 0)

    const patch = await session.mcpTool.invoke({
      requestKey: session.context.requestKey,
      workspaceId: session.context.workspaceId,
      courseId: workspace.course.id,
      baseRevision: 0,
      summary: '개요 작성하기 과제 정보를 선택 자료에서 정리합니다.',
      changes: {
        operation: 'assignment.upsert',
        values: {
          title: '개요 작성하기',
          dueAt: '2026-07-12T23:59:00+09:00',
          submissionMethod: 'LMS 과제함 업로드',
        },
      },
      evidence: [
        {
          field: 'title',
          rawMaterialId: syllabus.id,
          digest: syllabus.digest,
          quote: '과제: 개요 작성하기',
        },
        {
          field: 'dueAt',
          rawMaterialId: notice.id,
          digest: notice.digest,
          quote: 'RFC 3339 마감 시각은 2026-07-12T23:59:00+09:00입니다.',
        },
        {
          field: 'submissionMethod',
          rawMaterialId: syllabus.id,
          digest: syllabus.digest,
          quote: '제출 방식: LMS 과제함 업로드',
        },
      ],
    })

    assert.equal(patch.status, 'pending')
    assert.equal(patch.baseRevision, 0)
    assert.deepEqual(patch.changes.values, {
      title: '개요 작성하기',
      dueAt: '2026-07-12T23:59:00+09:00',
      submissionMethod: 'LMS 과제함 업로드',
    })
    assert.deepEqual(patch.evidence, [
      {
        field: 'dueAt',
        rawMaterialId: notice.id,
        digest: notice.digest,
        quote: 'RFC 3339 마감 시각은 2026-07-12T23:59:00+09:00입니다.',
      },
      {
        field: 'submissionMethod',
        rawMaterialId: syllabus.id,
        digest: syllabus.digest,
        quote: '제출 방식: LMS 과제함 업로드',
      },
      {
        field: 'title',
        rawMaterialId: syllabus.id,
        digest: syllabus.digest,
        quote: '과제: 개요 작성하기',
      },
    ])
    assert.deepEqual(controller.assignmentState(), {
      workspaceId: session.context.workspaceId,
      courseId: workspace.course.id,
      confirmedRevision: 0,
      assignments: [],
      statePatches: [patch],
      userConfirmations: [],
    })
  } finally {
    await materialized.cleanup()
  }
})

test('the deterministic MCP and Plan sequence commits an accepted Assignment before answering Codex and reopens it', async () => {
  const materialized = await materializeE2eSemesterWorkspace()
  const packageRoot = path.join(materialized.runRoot, 'package')
  const appDataRoot = path.join(materialized.runRoot, 'app-data')

  try {
    await Promise.all([packageRoot, appDataRoot].map((root) => mkdir(root)))
    const controller = createSemesterWorkspaceController({
      packageRoot,
      appDataRoot,
      chooseDirectory: async () => materialized.workspaceRoot,
    })
    const activation = await controller.activate()
    assert.equal(activation.status, 'activated')
    assert.equal(activation.workspace.state, 'ready')
    const workspace = await controller.createCourse('문제해결글쓰기')
    assert.ok(workspace.course)
    const notice = requireMaterial(workspace, 'lms-outline-notice.txt')
    const syllabus = requireMaterial(
      workspace,
      'problem-solving-syllabus.txt',
    )
    const session = await controller.createAssignmentProposalSession({
      courseId: workspace.course.id,
      selectedMaterials: [
        { rawMaterialId: notice.id, digest: notice.digest },
        { rawMaterialId: syllabus.id, digest: syllabus.digest },
      ],
      runtime: { threadId: 'thread-A', turnId: 'turn-A' },
    })
    const productInput = {
      threadId: 'thread-A',
      skill: {
        name: 'first-assignment',
        path: '/managed/first-assignment/SKILL.md',
      },
      text: `proposal request key: ${session.context.requestKey}`,
    } as const
    const requested = {
      type: 'user_input.requested',
      threadId: 'thread-A',
      turnId: 'turn-A',
      itemId: 'question-item-A',
      interactionId: 'interaction-A',
      questions: [ASSIGNMENT_REVIEW_QUESTION],
    } as const
    const runtime = new DeterministicCodexProductRuntime({
      threadIds: ['thread-A'],
      productTurns: [
        {
          input: productInput,
          turnId: 'turn-A',
          events: [
            {
              type: 'mcp_call.started',
              threadId: 'thread-A',
              turnId: 'turn-A',
              itemId: 'mcp-item-A',
              tool: 'propose_state_patch',
            },
            {
              type: 'mcp_call.completed',
              threadId: 'thread-A',
              turnId: 'turn-A',
              itemId: 'mcp-item-A',
              tool: 'propose_state_patch',
            },
            requested,
            {
              type: 'user_input.resolved',
              threadId: 'thread-A',
              turnId: 'turn-A',
              itemId: 'question-item-A',
              interactionId: 'interaction-A',
              resolution: 'answered',
            },
            {
              type: 'agent_message.completed',
              threadId: 'thread-A',
              turnId: 'turn-A',
              itemId: 'agent-item-A',
              text: '과제 정보를 반영했습니다.',
            },
            {
              type: 'turn.completed',
              threadId: 'thread-A',
              turnId: 'turn-A',
              status: 'completed',
            },
          ],
        },
      ],
    })
    const thread = await runtime.startThread()
    const turn = await runtime.startProductTurn({ ...productInput, threadId: thread.threadId })
    const events = turn.events[Symbol.asyncIterator]()

    assert.equal((await events.next()).value?.type, 'mcp_call.started')
    assert.equal(controller.assignmentState().statePatches.length, 0)
    const patch = await session.mcpTool.invoke(
      validPatchPayload(session.context, notice, syllabus),
    )
    assert.equal(patch.status, 'pending')
    assert.equal((await events.next()).value?.type, 'mcp_call.completed')
    assert.deepEqual((await events.next()).value, requested)
    const binding = await controller.bindAssignmentReview(requested)
    assert.ok(binding)
    assert.equal(binding.patchId, patch.id)
    assert.match(binding.decisionKey, /^decision_[0-9a-f]{32}$/)

    let observedCommittedState = false
    const coordinator = createAssignmentReviewCoordinator(controller, {
      answerUserInput: async (input) => {
        const committed = controller.assignmentState()
        assert.equal(committed.confirmedRevision, 1)
        assert.equal(committed.assignments.length, 1)
        assert.equal(committed.statePatches[0]?.status, 'applied')
        assert.equal(committed.userConfirmations[0]?.decision, 'accepted')
        observedCommittedState = true
        await runtime.answerUserInput(input)
      },
    })
    const settlementPromise = coordinator.submit({
      interactionId: binding.interactionId,
      patchId: binding.patchId,
      decisionKey: binding.decisionKey,
      decision: 'accept',
    })

    assert.equal((await events.next()).value?.type, 'user_input.resolved')
    const settlement = await settlementPromise
    assert.equal(observedCommittedState, true)
    assert.equal(settlement.replayed, false)
    assert.equal(settlement.confirmation.decision, 'accepted')
    const delayedProposalReplay = await session.mcpTool.invoke(
      validPatchPayload(session.context, notice, syllabus),
    )
    assert.equal(delayedProposalReplay.id, patch.id)
    assert.equal(delayedProposalReplay.status, 'applied')
    assert.deepEqual(delayedProposalReplay.applyOutcome, {
      type: 'applied',
      assignmentId: settlement.confirmation.assignmentId,
      resultingRevision: 1,
    })
    assert.equal((await events.next()).value?.type, 'agent_message.completed')
    assert.equal((await events.next()).value?.type, 'turn.completed')
    assert.equal((await events.next()).done, true)

    const reopenedController = createSemesterWorkspaceController({
      packageRoot,
      appDataRoot,
      chooseDirectory: async () => materialized.workspaceRoot,
    })
    const reopenedActivation = await reopenedController.activate()
    assert.equal(reopenedActivation.status, 'activated')
    assert.equal(reopenedActivation.workspace.state, 'ready')
    if (reopenedActivation.workspace.state === 'ready') {
      assert.deepEqual(reopenedActivation.workspace.course, workspace.course)
      assert.deepEqual(
        reopenedActivation.workspace.materials,
        workspace.materials,
      )
    }
    const reopened = reopenedController.assignmentState()
    assert.equal(reopened.workspaceId, session.context.workspaceId)
    assert.equal(reopened.confirmedRevision, 1)
    assert.equal(reopened.statePatches[0]?.status, 'applied')
    assert.equal(reopened.userConfirmations[0]?.decision, 'accepted')
    assert.deepEqual(reopened.assignments, [
      {
        id: settlement.confirmation.assignmentId,
        courseId: workspace.course.id,
        title: '개요 작성하기',
        dueAt: '2026-07-12T23:59:00+09:00',
        submissionMethod: 'LMS 과제함 업로드',
        evidence: patch.evidence,
      },
    ])
  } finally {
    await materialized.cleanup()
  }
})

test('reopen rejects a pre-corrective version 2 canonical payload without changing bytes', async () => {
  const fixture = await createReviewFixture()

  try {
    const legacy = await createSettledPreCorrectiveV2Store(
      fixture,
      'legacy-canonical',
    )
    assert.notEqual(
      legacy.legacyCanonicalPayload,
      legacy.currentCanonicalPayload,
    )
    await writeFile(legacy.storePath, legacy.bytes, 'utf8')

    const reopened = createSemesterWorkspaceController({
      packageRoot: fixture.packageRoot,
      appDataRoot: fixture.appDataRoot,
      chooseDirectory: async () => fixture.workspaceRoot,
    })
    assert.deepEqual(await reopened.activate(), {
      status: 'activated',
      workspace: {
        state: 'incompatible',
        readOnly: true,
        supportedStoreFormatVersion: 2,
        foundStoreFormatVersion: 2,
        displayMessage:
          '이 SemesterWorkspace의 제품 상태는 현재 AY-PLE에서 안전하게 열 수 없습니다. 원본을 보존한 채 지원되는 AY-PLE로 다시 여세요.',
      },
    })
    assert.deepEqual(
      await readFile(legacy.storePath),
      Buffer.from(legacy.bytes, 'utf8'),
    )
  } finally {
    await fixture.cleanup()
  }
})

test('reject records a durable no-apply decision and nominal retry does not answer Codex twice', async () => {
  const materialized = await materializeE2eSemesterWorkspace()
  const packageRoot = path.join(materialized.runRoot, 'package')
  const appDataRoot = path.join(materialized.runRoot, 'app-data')

  try {
    await Promise.all([packageRoot, appDataRoot].map((root) => mkdir(root)))
    const controller = createSemesterWorkspaceController({
      packageRoot,
      appDataRoot,
      chooseDirectory: async () => materialized.workspaceRoot,
    })
    const activation = await controller.activate()
    assert.equal(activation.status, 'activated')
    assert.equal(activation.workspace.state, 'ready')
    const workspace = await controller.createCourse('문제해결글쓰기')
    assert.ok(workspace.course)
    const notice = requireMaterial(workspace, 'lms-outline-notice.txt')
    const syllabus = requireMaterial(
      workspace,
      'problem-solving-syllabus.txt',
    )
    const session = await controller.createAssignmentProposalSession({
      courseId: workspace.course.id,
      selectedMaterials: [
        { rawMaterialId: notice.id, digest: notice.digest },
        { rawMaterialId: syllabus.id, digest: syllabus.digest },
      ],
      runtime: { threadId: 'thread-reject', turnId: 'turn-reject' },
    })
    const patch = await session.mcpTool.invoke(
      validPatchPayload(session.context, notice, syllabus),
    )
    const binding = await controller.bindAssignmentReview({
      type: 'user_input.requested',
      threadId: 'thread-reject',
      turnId: 'turn-reject',
      itemId: 'question-reject',
      interactionId: 'interaction-reject',
      questions: [ASSIGNMENT_REVIEW_QUESTION],
    })
    assert.ok(binding)
    const nativeAnswers: unknown[] = []
    const coordinator = createAssignmentReviewCoordinator(controller, {
      answerUserInput: async (answer) => {
        const committed = controller.assignmentState()
        assert.equal(committed.confirmedRevision, 0)
        assert.deepEqual(committed.assignments, [])
        assert.equal(committed.statePatches[0]?.status, 'rejected')
        assert.equal(committed.userConfirmations[0]?.decision, 'rejected')
        nativeAnswers.push(answer)
      },
    })
    const decision = {
      interactionId: binding.interactionId,
      patchId: patch.id,
      decisionKey: binding.decisionKey,
      decision: 'reject',
    } as const

    const settled = await coordinator.submit(decision)
    assert.equal(settled.replayed, false)
    assert.equal(settled.confirmation.outcome, 'not_applied')
    assert.deepEqual(settled.patch.applyOutcome, {
      type: 'not_applied',
      revision: 0,
    })
    assert.deepEqual(nativeAnswers, [
      {
        interactionId: 'interaction-reject',
        answers: { assignment_review_decision: ['거절'] },
      },
    ])

    const replayed = await coordinator.submit(decision)
    assert.equal(replayed.replayed, true)
    assert.equal(replayed.confirmation.id, settled.confirmation.id)
    assert.equal(nativeAnswers.length, 1)
    await assert.rejects(
      coordinator.submit({
        ...decision,
        interactionId: 'interaction-other',
      }),
      (error: unknown) =>
        error instanceof StatePatchReviewError &&
        error.code === 'review_conflict',
    )
    await assert.rejects(
      coordinator.submit({ ...decision, decision: 'accept' }),
      (error: unknown) =>
        error instanceof Error &&
        'code' in error &&
        error.code === 'review_conflict',
    )
    assert.equal(controller.assignmentState().userConfirmations.length, 1)

    const reopened = createSemesterWorkspaceController({
      packageRoot,
      appDataRoot,
      chooseDirectory: async () => materialized.workspaceRoot,
    })
    await reopened.activate()
    assert.deepEqual(reopened.assignmentState(), controller.assignmentState())
  } finally {
    await materialized.cleanup()
  }
})

test('revision feedback rotates the proposal key and atomically replaces the pending patch before a second Review', async () => {
  const fixture = await createReviewFixture()

  try {
    const original = await createAndBindPatch(
      fixture,
      'thread-revision',
      'turn-revision',
      'interaction-revision-original',
    )
    const input = {
      ...original.binding,
      decision: 'revise',
      feedback: '제출 방식에 발표 자료와 보고서를 모두 포함해 주세요.',
    } as const

    const revision = await fixture.controller.requestAssignmentReviewRevision(
      input,
    )
    assert.equal(revision.replayed, false)
    assert.equal(revision.patch.id, original.patch.id)
    assert.notEqual(
      revision.proposal.context.requestKey,
      original.patch.requestKey,
    )
    assert.equal(revision.proposal.context.baseRevision, 0)
    const pendingRevision = fixture.controller.assignmentState()
    assert.equal(pendingRevision.confirmedRevision, 0)
    assert.deepEqual(pendingRevision.assignments, [])
    assert.deepEqual(pendingRevision.statePatches, [original.patch])
    assert.deepEqual(pendingRevision.userConfirmations, [])

    const replayed =
      await fixture.controller.requestAssignmentReviewRevision(input)
    assert.equal(replayed.replayed, true)
    assert.equal(
      replayed.proposal.context.requestKey,
      revision.proposal.context.requestKey,
    )
    await assert.rejects(
      fixture.controller.requestAssignmentReviewRevision({
        ...input,
        feedback: '다른 피드백으로 같은 decision key를 재사용합니다.',
      }),
      (error: unknown) =>
        error instanceof StatePatchReviewError &&
        error.code === 'review_conflict',
    )
    await assert.rejects(
      fixture.controller.commitAssignmentReviewDecision({
        ...original.binding,
        decision: 'accept',
      }),
      (error: unknown) =>
        error instanceof StatePatchReviewError &&
        error.code === 'review_not_pending',
    )

    const replacementPayload = validPatchPayload(
      revision.proposal.context,
      fixture.notice,
      fixture.syllabus,
    )
    const replacement = await revision.proposal.mcpTool.invoke({
      ...replacementPayload,
      summary: '수정 요청을 반영한 replacement Assignment 제안입니다.',
      changes: {
        ...replacementPayload.changes,
        values: {
          ...replacementPayload.changes.values,
          submissionMethod: '발표 자료와 보고서를 LMS 과제함에 업로드',
        },
      },
      evidence: replacementPayload.evidence.map((evidence) =>
        evidence.field === 'submissionMethod'
          ? {
              ...evidence,
              quote: '제출 방식: LMS 과제함 업로드',
            }
          : evidence,
      ),
    })
    const replaced = fixture.controller.assignmentState()
    assert.equal(replaced.confirmedRevision, 0)
    assert.deepEqual(replaced.assignments, [])
    assert.deepEqual(replaced.userConfirmations, [])
    assert.equal(replaced.statePatches.length, 2)
    assert.equal(replaced.statePatches[0]?.id, original.patch.id)
    assert.equal(replaced.statePatches[0]?.status, 'superseded')
    assert.equal(replaced.statePatches[1]?.id, replacement.id)
    assert.equal(replaced.statePatches[1]?.status, 'pending')

    const replacementBinding = await fixture.controller.bindAssignmentReview({
      type: 'user_input.requested',
      threadId: 'thread-revision',
      turnId: 'turn-revision',
      itemId: 'question-revision-replacement',
      interactionId: 'interaction-revision-replacement',
      questions: [ASSIGNMENT_REVIEW_QUESTION],
    })
    assert.ok(replacementBinding)
    assert.equal(replacementBinding.patchId, replacement.id)
    const accepted = await fixture.controller.commitAssignmentReviewDecision({
      ...replacementBinding,
      decision: 'accept',
    })
    assert.equal(accepted.confirmedRevision, 1)
    const settled = fixture.controller.assignmentState()
    assert.equal(settled.statePatches[0]?.status, 'superseded')
    assert.equal(settled.statePatches[1]?.status, 'applied')
    assert.equal(settled.userConfirmations.length, 1)
    assert.equal(settled.userConfirmations[0]?.patchId, replacement.id)
  } finally {
    await fixture.cleanup()
  }
})

test('invalid replacement interrupts the original patch without confirmation or apply', async () => {
  const fixture = await createReviewFixture()

  try {
    const original = await createAndBindPatch(
      fixture,
      'thread-invalid-revision',
      'turn-invalid-revision',
      'interaction-invalid-revision',
    )
    const revision =
      await fixture.controller.requestAssignmentReviewRevision({
        ...original.binding,
        decision: 'revise',
        feedback: '근거와 맞지 않는 값을 고쳐 주세요.',
      })
    const payload = validPatchPayload(
      revision.proposal.context,
      fixture.notice,
      fixture.syllabus,
    )

    await assert.rejects(
      revision.proposal.mcpTool.invoke({
        ...payload,
        evidence: payload.evidence.map((evidence, index) =>
          index === 0 ? { ...evidence, quote: '원문에 없는 근거' } : evidence,
        ),
      }),
      (error: unknown) =>
        error instanceof StatePatchReviewError &&
        error.code === 'proposal_invalid',
    )
    const state = fixture.controller.assignmentState()
    assert.equal(state.confirmedRevision, 0)
    assert.deepEqual(state.assignments, [])
    assert.deepEqual(state.userConfirmations, [])
    assert.equal(state.statePatches.length, 1)
    assert.equal(state.statePatches[0]?.id, original.patch.id)
    assert.equal(state.statePatches[0]?.status, 'interrupted')
    await assert.rejects(
      fixture.controller.commitAssignmentReviewDecision({
        ...original.binding,
        decision: 'accept',
      }),
      (error: unknown) =>
        error instanceof StatePatchReviewError &&
        error.code === 'review_not_pending',
    )
  } finally {
    await fixture.cleanup()
  }
})

test('native revision answer failure abandons the replacement and interrupts the original patch', async () => {
  const fixture = await createReviewFixture()

  try {
    const original = await createAndBindPatch(
      fixture,
      'thread-answer-failure',
      'turn-answer-failure',
      'interaction-answer-failure',
    )
    let replacementPrepared = false
    let replacementAbandoned = false
    const coordinator = createAssignmentReviewCoordinator(
      fixture.controller,
      {
        prepareReplacement: (proposal) => {
          replacementPrepared = true
          assert.notEqual(
            proposal.context.requestKey,
            original.patch.requestKey,
          )
          return () => {
            replacementAbandoned = true
          }
        },
        answerUserInput: async () => {
          throw new Error('native answer failed')
        },
      },
    )

    await assert.rejects(
      coordinator.submit({
        ...original.binding,
        decision: 'revise',
        feedback: '마감 근거를 다시 확인해 주세요.',
      }),
      /native answer failed/,
    )
    assert.equal(replacementPrepared, true)
    assert.equal(replacementAbandoned, true)
    const state = fixture.controller.assignmentState()
    assert.equal(state.confirmedRevision, 0)
    assert.deepEqual(state.assignments, [])
    assert.deepEqual(state.userConfirmations, [])
    assert.equal(state.statePatches.length, 1)
    assert.equal(state.statePatches[0]?.id, original.patch.id)
    assert.equal(state.statePatches[0]?.status, 'interrupted')
  } finally {
    await fixture.cleanup()
  }
})

test('invalid proposal shapes, evidence, values, and changed source bytes leave product state untouched', async () => {
  const fixture = await createReviewFixture()

  try {
    const session = await fixture.controller.createAssignmentProposalSession({
      courseId: fixture.courseId,
      selectedMaterials: [
        { rawMaterialId: fixture.notice.id, digest: fixture.notice.digest },
        { rawMaterialId: fixture.syllabus.id, digest: fixture.syllabus.digest },
      ],
      runtime: { threadId: 'thread-invalid', turnId: 'turn-invalid' },
    })
    const valid = validPatchPayload(
      session.context,
      fixture.notice,
      fixture.syllabus,
    )
    const titleEvidence = valid.evidence.find(
      (evidence) => evidence.field === 'title',
    )
    assert.ok(titleEvidence)

    const invalidCases: readonly {
      readonly name: string
      readonly payload: unknown
    }[] = [
      {
        name: 'unknown top-level field',
        payload: { ...valid, arbitraryState: true },
      },
      {
        name: 'generic operation',
        payload: {
          ...valid,
          changes: { ...valid.changes, operation: 'replace' },
        },
      },
      {
        name: 'unselected source',
        payload: {
          ...valid,
          evidence: valid.evidence.map((evidence) =>
            evidence === titleEvidence
              ? {
                  ...evidence,
                  rawMaterialId: fixture.control.id,
                  digest: fixture.control.digest,
                }
              : evidence,
          ),
        },
      },
      {
        name: 'stale evidence digest',
        payload: {
          ...valid,
          evidence: valid.evidence.map((evidence) =>
            evidence === titleEvidence
              ? { ...evidence, digest: '0'.repeat(64) }
              : evidence,
          ),
        },
      },
      {
        name: 'quote mismatch',
        payload: {
          ...valid,
          evidence: valid.evidence.map((evidence) =>
            evidence === titleEvidence
              ? { ...evidence, quote: '원문에 존재하지 않는 제목 근거' }
              : evidence,
          ),
        },
      },
      {
        name: 'ambiguous dueAt',
        payload: {
          ...valid,
          changes: {
            ...valid.changes,
            values: {
              ...valid.changes.values,
              dueAt: '2026-07-12 23:59',
            },
          },
        },
      },
      {
        name: 'unknown local UTC offset',
        payload: {
          ...valid,
          changes: {
            ...valid.changes,
            values: {
              ...valid.changes.values,
              dueAt: '2026-07-12T23:59:00-00:00',
            },
          },
        },
      },
      {
        name: 'unknown Assignment update target',
        payload: {
          ...valid,
          changes: {
            ...valid.changes,
            assignmentId: `assignment_${'f'.repeat(32)}`,
          },
        },
      },
    ]

    for (const candidate of invalidCases) {
      await assert.rejects(
        session.mcpTool.invoke(candidate.payload),
        (error: unknown) =>
          error instanceof StatePatchReviewError &&
          error.code === 'proposal_invalid',
        candidate.name,
      )
    }
    assert.deepEqual(fixture.controller.assignmentState(), {
      workspaceId: session.context.workspaceId,
      courseId: fixture.courseId,
      confirmedRevision: 0,
      assignments: [],
      statePatches: [],
      userConfirmations: [],
    })

    await writeFile(
      path.join(fixture.workspaceRoot, fixture.notice.relativePath),
      '선택 이후 바뀐 자료',
      'utf8',
    )
    await assert.rejects(
      session.mcpTool.invoke(valid),
      (error: unknown) =>
        error instanceof StatePatchReviewError &&
        error.code === 'proposal_stale',
    )
    assert.equal(fixture.controller.assignmentState().statePatches.length, 0)

    await assert.rejects(
      session.mcpTool.invoke({
        ...valid,
        workspaceId: `workspace_${'f'.repeat(32)}`,
      }),
      (error: unknown) =>
        error instanceof StatePatchReviewError &&
        error.code === 'proposal_context_invalid',
    )
    assert.equal(fixture.controller.assignmentState().statePatches.length, 0)
  } finally {
    await fixture.cleanup()
  }
})

test('canonical request replay returns one patch and a conflicting payload cannot create another', async () => {
  const fixture = await createReviewFixture()

  try {
    const session = await fixture.controller.createAssignmentProposalSession({
      courseId: fixture.courseId,
      selectedMaterials: [
        { rawMaterialId: fixture.notice.id, digest: fixture.notice.digest },
        { rawMaterialId: fixture.syllabus.id, digest: fixture.syllabus.digest },
      ],
      runtime: { threadId: 'thread-replay', turnId: 'turn-replay' },
    })
    const payload = validPatchPayload(
      session.context,
      fixture.notice,
      fixture.syllabus,
    )
    const reorderedPayload = {
      evidence: [...payload.evidence].reverse().map((evidence) => ({
        quote: evidence.quote,
        digest: evidence.digest,
        rawMaterialId: evidence.rawMaterialId,
        field: evidence.field,
      })),
      changes: {
        values: {
          submissionMethod: payload.changes.values.submissionMethod,
          dueAt: payload.changes.values.dueAt,
          title: payload.changes.values.title,
        },
        operation: payload.changes.operation,
      },
      summary: payload.summary,
      baseRevision: payload.baseRevision,
      courseId: payload.courseId,
      workspaceId: payload.workspaceId,
      requestKey: payload.requestKey,
    }
    const [created, replayed] = await Promise.all([
      session.mcpTool.invoke(payload),
      session.mcpTool.invoke(reorderedPayload),
    ])

    assert.deepEqual(replayed, created)
    await assert.rejects(
      session.mcpTool.invoke({
        ...payload,
        summary: '같은 key에 다른 canonical payload를 제출합니다.',
      }),
      (error: unknown) =>
        error instanceof StatePatchReviewError &&
        error.code === 'proposal_conflict',
    )
    assert.deepEqual(fixture.controller.assignmentState().statePatches, [
      created,
    ])
  } finally {
    await fixture.cleanup()
  }
})

test('workspace reactivation invalidates an old proposal tool session', async () => {
  const fixture = await createReviewFixture()

  try {
    const session = await fixture.controller.createAssignmentProposalSession({
      courseId: fixture.courseId,
      selectedMaterials: [
        { rawMaterialId: fixture.notice.id, digest: fixture.notice.digest },
        { rawMaterialId: fixture.syllabus.id, digest: fixture.syllabus.digest },
      ],
      runtime: { threadId: 'thread-old', turnId: 'turn-old' },
    })
    await fixture.controller.activate()

    await assert.rejects(
      session.mcpTool.invoke(
        validPatchPayload(
          session.context,
          fixture.notice,
          fixture.syllabus,
        ),
      ),
      (error: unknown) =>
        error instanceof StatePatchReviewError &&
        error.code === 'proposal_context_invalid',
    )
    assert.equal(fixture.controller.assignmentState().statePatches.length, 0)
  } finally {
    await fixture.cleanup()
  }
})

test('only the exact Plan question from the patch native Turn becomes a product Review', async () => {
  const fixture = await createReviewFixture()

  try {
    const session = await fixture.controller.createAssignmentProposalSession({
      courseId: fixture.courseId,
      selectedMaterials: [
        { rawMaterialId: fixture.notice.id, digest: fixture.notice.digest },
        { rawMaterialId: fixture.syllabus.id, digest: fixture.syllabus.digest },
      ],
      runtime: { threadId: 'thread-bind', turnId: 'turn-bind' },
    })
    const patch = await session.mcpTool.invoke(
      validPatchPayload(session.context, fixture.notice, fixture.syllabus),
    )
    const ordinaryClarification = {
      type: 'user_input.requested',
      threadId: 'thread-bind',
      turnId: 'turn-bind',
      itemId: 'question-ordinary',
      interactionId: 'interaction-ordinary',
      questions: [
        {
          id: 'ordinary_clarification',
          header: '추가 확인',
          question: '어느 표현을 사용하면 좋을까요?',
          options: null,
          acceptsFreeform: true,
        },
      ],
    } as const
    assert.equal(
      await fixture.controller.bindAssignmentReview(ordinaryClarification),
      null,
    )
    assert.equal(
      await fixture.controller.bindAssignmentReview({
        ...ordinaryClarification,
        turnId: 'turn-other',
        itemId: 'question-wrong-turn',
        interactionId: 'interaction-wrong-turn',
        questions: [ASSIGNMENT_REVIEW_QUESTION],
      }),
      null,
    )

    const exact = {
      ...ordinaryClarification,
      itemId: 'question-exact',
      interactionId: 'interaction-exact',
      questions: [ASSIGNMENT_REVIEW_QUESTION],
    } as const
    const binding = await fixture.controller.bindAssignmentReview(exact)
    assert.ok(binding)
    assert.equal(binding.patchId, patch.id)
    assert.deepEqual(
      await fixture.controller.bindAssignmentReview(exact),
      binding,
    )
    await assert.rejects(
      fixture.controller.bindAssignmentReview({
        ...exact,
        itemId: 'question-second',
        interactionId: 'interaction-second',
      }),
      (error: unknown) =>
        error instanceof StatePatchReviewError &&
        error.code === 'review_conflict',
    )
    assert.equal(fixture.controller.assignmentState().confirmedRevision, 0)
    assert.deepEqual(fixture.controller.assignmentState().assignments, [])
  } finally {
    await fixture.cleanup()
  }
})

test('stale proposal and settlement bases cannot create a second confirmation or apply', async () => {
  const fixture = await createReviewFixture()

  try {
    const staleSession = await fixture.controller.createAssignmentProposalSession({
      courseId: fixture.courseId,
      selectedMaterials: [
        { rawMaterialId: fixture.notice.id, digest: fixture.notice.digest },
        { rawMaterialId: fixture.syllabus.id, digest: fixture.syllabus.digest },
      ],
      runtime: { threadId: 'thread-stale', turnId: 'turn-stale' },
    })
    const first = await createAndBindPatch(
      fixture,
      'thread-first',
      'turn-first',
      'interaction-first',
    )
    await fixture.controller.commitAssignmentReviewDecision({
      ...first.binding,
      decision: 'accept',
    })
    assert.equal(fixture.controller.assignmentState().confirmedRevision, 1)

    await assert.rejects(
      staleSession.mcpTool.invoke(
        validPatchPayload(
          staleSession.context,
          fixture.notice,
          fixture.syllabus,
        ),
      ),
      (error: unknown) =>
        error instanceof StatePatchReviewError &&
        error.code === 'proposal_stale',
    )

    const staleSettlement = await createAndBindPatch(
      fixture,
      'thread-settle-stale',
      'turn-settle-stale',
      'interaction-settle-stale',
    )
    const advancing = await createAndBindPatch(
      fixture,
      'thread-advancing',
      'turn-advancing',
      'interaction-advancing',
    )
    await fixture.controller.commitAssignmentReviewDecision({
      ...advancing.binding,
      decision: 'accept',
    })
    const beforeStaleDecision = fixture.controller.assignmentState()
    assert.equal(beforeStaleDecision.confirmedRevision, 2)
    assert.equal(beforeStaleDecision.userConfirmations.length, 2)

    await assert.rejects(
      fixture.controller.commitAssignmentReviewDecision({
        ...staleSettlement.binding,
        decision: 'accept',
      }),
      (error: unknown) =>
        error instanceof StatePatchReviewError &&
        error.code === 'review_conflict',
    )
    const afterStaleDecision = fixture.controller.assignmentState()
    assert.equal(afterStaleDecision.confirmedRevision, 2)
    assert.equal(afterStaleDecision.assignments.length, 2)
    assert.equal(afterStaleDecision.userConfirmations.length, 2)
    assert.equal(
      afterStaleDecision.statePatches.find(
        (patch) => patch.id === staleSettlement.patch.id,
      )?.status,
      'pending',
    )
  } finally {
    await fixture.cleanup()
  }
})

test('assignment.upsert updates an existing Assignment without changing its stable identity', async () => {
  const fixture = await createReviewFixture()

  try {
    const created = await createAndBindPatch(
      fixture,
      'thread-create',
      'turn-create',
      'interaction-create',
    )
    const createCommit = await fixture.controller.commitAssignmentReviewDecision({
      ...created.binding,
      decision: 'accept',
    })
    assert.ok(createCommit.confirmation.assignmentId)

    const updateSession = await fixture.controller.createAssignmentProposalSession({
      courseId: fixture.courseId,
      selectedMaterials: [
        { rawMaterialId: fixture.notice.id, digest: fixture.notice.digest },
        { rawMaterialId: fixture.syllabus.id, digest: fixture.syllabus.digest },
      ],
      runtime: { threadId: 'thread-update', turnId: 'turn-update' },
    })
    const updatePayload = validPatchPayload(
      updateSession.context,
      fixture.notice,
      fixture.syllabus,
    )
    const updatePatch = await updateSession.mcpTool.invoke({
      ...updatePayload,
      summary: '기존 Assignment를 같은 근거 기준으로 다시 정산합니다.',
      changes: {
        ...updatePayload.changes,
        assignmentId: createCommit.confirmation.assignmentId,
      },
    })
    const updateBinding = await fixture.controller.bindAssignmentReview({
      type: 'user_input.requested',
      threadId: 'thread-update',
      turnId: 'turn-update',
      itemId: 'question-update',
      interactionId: 'interaction-update',
      questions: [ASSIGNMENT_REVIEW_QUESTION],
    })
    assert.ok(updateBinding)
    const updateCommit = await fixture.controller.commitAssignmentReviewDecision({
      ...updateBinding,
      decision: 'accept',
    })
    const state = fixture.controller.assignmentState()

    assert.equal(updatePatch.changes.assignmentId, createCommit.confirmation.assignmentId)
    assert.equal(updateCommit.confirmation.assignmentId, createCommit.confirmation.assignmentId)
    assert.equal(state.confirmedRevision, 2)
    assert.equal(state.assignments.length, 1)
    assert.equal(state.assignments[0]?.id, createCommit.confirmation.assignmentId)
    assert.equal(state.statePatches.length, 2)
    assert.equal(state.userConfirmations.length, 2)
  } finally {
    await fixture.cleanup()
  }
})

test('reopen rejects relationally inconsistent version 2 state without rewriting it', async () => {
  const fixture = await createReviewFixture()

  try {
    const created = await createAndBindPatch(
      fixture,
      'thread-corruption',
      'turn-corruption',
      'interaction-corruption',
    )
    await fixture.controller.commitAssignmentReviewDecision({
      ...created.binding,
      decision: 'accept',
    })
    const storePath = path.join(
      fixture.workspaceRoot,
      '.ay-ple',
      'workspace-state.json',
    )
    const validStore = JSON.parse(
      await readFile(storePath, 'utf8'),
    ) as MutableStoredWorkspace
    const corruptions: readonly {
      readonly name: string
      readonly mutate: (store: MutableStoredWorkspace) => void
    }[] = [
      {
        name: 'no Course with a confirmed revision',
        mutate: (store) => {
          store.course = null
          store.assignments = []
          store.statePatches = []
          store.userConfirmations = []
        },
      },
      {
        name: 'confirmed revision without accepted history',
        mutate: (store) => {
          store.assignments = []
          store.statePatches = []
          store.userConfirmations = []
        },
      },
      {
        name: 'foreign patch workspace',
        mutate: (store) => {
          assert.ok(store.statePatches[0])
          store.statePatches[0].workspaceId = `workspace_${'f'.repeat(32)}`
        },
      },
      {
        name: 'applied patch without apply outcome',
        mutate: (store) => {
          assert.ok(store.statePatches[0])
          store.statePatches[0].applyOutcome = null
        },
      },
      {
        name: 'confirmation for a missing patch',
        mutate: (store) => {
          assert.ok(store.userConfirmations[0])
          store.userConfirmations[0].patchId = `patch_${'f'.repeat(32)}`
        },
      },
      {
        name: 'applied update target disagrees with its outcome',
        mutate: (store) => {
          const patch = store.statePatches[0]
          assert.ok(patch)
          const assignmentId = `assignment_${'f'.repeat(32)}`
          patch.changes.assignmentId = assignmentId
          const canonical = JSON.parse(
            patch.canonicalPayload,
          ) as MutableCanonicalPayload
          canonical.changes = {
            operation: 'assignment.upsert',
            assignmentId,
            values: canonical.changes.values,
          }
          patch.canonicalPayload = JSON.stringify(canonical)
        },
      },
      {
        name: 'malformed canonical payload',
        mutate: (store) => {
          assert.ok(store.statePatches[0])
          store.statePatches[0].canonicalPayload = '{"requestKey":'
        },
      },
      {
        name: 'unknown canonical payload field',
        mutate: (store) => {
          const patch = store.statePatches[0]
          assert.ok(patch)
          const canonical = JSON.parse(
            patch.canonicalPayload,
          ) as MutableCanonicalPayload
          canonical.unknownAuthority = true
          patch.canonicalPayload = JSON.stringify(canonical)
        },
      },
      {
        name: 'canonical payload disagrees with patch fields',
        mutate: (store) => {
          const patch = store.statePatches[0]
          assert.ok(patch)
          const canonical = JSON.parse(
            patch.canonicalPayload,
          ) as MutableCanonicalPayload
          canonical.summary = 'persisted patch와 다른 의미입니다.'
          patch.canonicalPayload = JSON.stringify(canonical)
        },
      },
      {
        name: 'pretty-printed canonical payload was never producer output',
        mutate: (store) => {
          const patch = store.statePatches[0]
          assert.ok(patch)
          patch.canonicalPayload = JSON.stringify(
            JSON.parse(patch.canonicalPayload),
            null,
            2,
          )
        },
      },
      {
        name: 'reordered canonical payload root was never producer output',
        mutate: (store) => {
          const patch = store.statePatches[0]
          assert.ok(patch)
          const canonical = JSON.parse(
            patch.canonicalPayload,
          ) as MutableCanonicalPayload
          const reordered = {
            summary: canonical.summary,
            requestKey: canonical.requestKey,
            workspaceId: canonical.workspaceId,
            courseId: canonical.courseId,
            baseRevision: canonical.baseRevision,
            changes: canonical.changes,
            evidence: canonical.evidence,
            ...(canonical.origin === undefined
              ? {}
              : { origin: canonical.origin }),
          }
          patch.canonicalPayload = JSON.stringify(reordered)
        },
      },
      {
        name: 'reordered canonical changes were never producer output',
        mutate: (store) => {
          const patch = store.statePatches[0]
          assert.ok(patch)
          const canonical = JSON.parse(
            patch.canonicalPayload,
          ) as MutableCanonicalPayload
          canonical.changes = {
            values: canonical.changes.values,
            operation: canonical.changes.operation,
          }
          patch.canonicalPayload = JSON.stringify(canonical)
        },
      },
      {
        name: 'reordered canonical evidence array was never producer output',
        mutate: (store) => {
          const patch = store.statePatches[0]
          assert.ok(patch)
          const canonical = JSON.parse(
            patch.canonicalPayload,
          ) as MutableCanonicalPayload
          canonical.evidence.reverse()
          patch.canonicalPayload = JSON.stringify(canonical)
        },
      },
      {
        name: 'unknown current-version top-level state',
        mutate: (store) => {
          store.unknownAuthority = { shouldNotDisappear: true }
        },
      },
      {
        name: 'unknown current-version Course state',
        mutate: (store) => {
          assert.ok(store.course)
          store.course.unknownAuthority = true
        },
      },
    ]

    for (const candidate of corruptions) {
      const corrupted = cloneStoredWorkspace(validStore)
      candidate.mutate(corrupted)
      const bytes = `${JSON.stringify(corrupted, null, 2)}\n`
      await writeFile(storePath, bytes, 'utf8')
      const reopened = createSemesterWorkspaceController({
        packageRoot: fixture.packageRoot,
        appDataRoot: fixture.appDataRoot,
        chooseDirectory: async () => fixture.workspaceRoot,
      })
      assert.deepEqual(
        await reopened.activate(),
        {
          status: 'activated',
          workspace: {
            state: 'incompatible',
            readOnly: true,
            supportedStoreFormatVersion: 2,
            foundStoreFormatVersion: 2,
            displayMessage:
              '이 SemesterWorkspace의 제품 상태는 현재 AY-PLE에서 안전하게 열 수 없습니다. 원본을 보존한 채 지원되는 AY-PLE로 다시 여세요.',
          },
        },
        candidate.name,
      )
      assert.equal(await readFile(storePath, 'utf8'), bytes, candidate.name)

      if (candidate === corruptions[0]) {
        assert.deepEqual(
          await fixture.controller.activate(),
          {
            status: 'activated',
            workspace: {
              state: 'incompatible',
              readOnly: true,
              supportedStoreFormatVersion: 2,
              foundStoreFormatVersion: 2,
              displayMessage:
                '이 SemesterWorkspace의 제품 상태는 현재 AY-PLE에서 안전하게 열 수 없습니다. 원본을 보존한 채 지원되는 AY-PLE로 다시 여세요.',
            },
          },
          candidate.name,
        )
        assert.throws(
          () => fixture.controller.assignmentState(),
          (error: unknown) =>
            error instanceof SemesterWorkspaceError &&
            error.code === 'workspace_incompatible',
          candidate.name,
        )
        assert.equal(await readFile(storePath, 'utf8'), bytes, candidate.name)
      }
    }
  } finally {
    await fixture.cleanup()
  }
})

async function createReviewFixture() {
  const materialized = await materializeE2eSemesterWorkspace()
  const packageRoot = path.join(materialized.runRoot, 'package')
  const appDataRoot = path.join(materialized.runRoot, 'app-data')
  await Promise.all([packageRoot, appDataRoot].map((root) => mkdir(root)))
  const controller = createSemesterWorkspaceController({
    packageRoot,
    appDataRoot,
    chooseDirectory: async () => materialized.workspaceRoot,
  })
  const activation = await controller.activate()
  assert.equal(activation.status, 'activated')
  assert.equal(activation.workspace.state, 'ready')
  const workspace = await controller.createCourse('문제해결글쓰기')
  assert.ok(workspace.course)
  return {
    appDataRoot,
    controller,
    courseId: workspace.course.id,
    notice: requireMaterial(workspace, 'lms-outline-notice.txt'),
    syllabus: requireMaterial(workspace, 'problem-solving-syllabus.txt'),
    control: requireMaterial(workspace, 'unselected-control.txt'),
    packageRoot,
    workspaceRoot: materialized.workspaceRoot,
    cleanup: () => materialized.cleanup(),
  }
}

type MutableAssignmentValues = {
  title: string
  dueAt: string
  submissionMethod: string
}

type MutableAssignmentUpsert = {
  operation: string
  assignmentId?: string
  values: MutableAssignmentValues
}

type MutableEvidenceRef = {
  field: string
  rawMaterialId: string
  digest: string
  quote: string
}

type MutableStoredWorkspace = Record<string, unknown> & {
  course: (Record<string, unknown> & { id: string }) | null
  statePatches: (Record<string, unknown> & {
    applyOutcome: unknown
    canonicalPayload: string
    changes: MutableAssignmentUpsert
    evidence: MutableEvidenceRef[]
    workspaceId: string
  })[]
  userConfirmations: (Record<string, unknown> & { patchId: string })[]
}

type MutableCanonicalPayload = Record<string, unknown> & {
  changes: MutableAssignmentUpsert
  evidence: MutableEvidenceRef[]
}

type ReviewFixture = Awaited<ReturnType<typeof createReviewFixture>>

async function createSettledPreCorrectiveV2Store(
  fixture: ReviewFixture,
  identity: string,
) {
  const created = await createAndBindPatch(
    fixture,
    `thread-${identity}`,
    `turn-${identity}`,
    `interaction-${identity}`,
  )
  await fixture.controller.commitAssignmentReviewDecision({
    ...created.binding,
    decision: 'accept',
  })
  const storePath = path.join(
    fixture.workspaceRoot,
    '.ay-ple',
    'workspace-state.json',
  )
  const store = JSON.parse(
    await readFile(storePath, 'utf8'),
  ) as MutableStoredWorkspace
  store.formatVersion = 2
  delete store.modelingRuns
  delete store.executionGuard
  const patch = store.statePatches[0]
  assert.ok(patch)
  const currentCanonicalPayload = rewriteAsPreCorrectiveCanonical(patch)

  return {
    bytes: `${JSON.stringify(store, null, 2)}\n`,
    currentCanonicalPayload,
    legacyCanonicalPayload: patch.canonicalPayload,
    storePath,
  }
}

function rewriteAsPreCorrectiveCanonical(
  patch: MutableStoredWorkspace['statePatches'][number],
): string {
  const currentCanonicalPayload = patch.canonicalPayload
  patch.changes = cloneWithPreCorrectiveAssignmentOrder(patch.changes)
  patch.evidence = patch.evidence.map(cloneWithPreCorrectiveEvidenceOrder)
  const legacyCanonicalPayload = JSON.parse(
    currentCanonicalPayload,
  ) as MutableCanonicalPayload
  legacyCanonicalPayload.changes = patch.changes
  legacyCanonicalPayload.evidence = patch.evidence
  patch.canonicalPayload = JSON.stringify(legacyCanonicalPayload)
  return currentCanonicalPayload
}

function cloneWithPreCorrectiveAssignmentOrder(
  changes: MutableAssignmentUpsert,
): MutableAssignmentUpsert {
  return {
    operation: changes.operation,
    ...(changes.assignmentId === undefined
      ? {}
      : { assignmentId: changes.assignmentId }),
    values: {
      submissionMethod: changes.values.submissionMethod,
      dueAt: changes.values.dueAt,
      title: changes.values.title,
    },
  }
}

function cloneWithPreCorrectiveEvidenceOrder(
  evidence: MutableEvidenceRef,
): MutableEvidenceRef {
  return {
    quote: evidence.quote,
    digest: evidence.digest,
    rawMaterialId: evidence.rawMaterialId,
    field: evidence.field,
  }
}

function cloneStoredWorkspace(
  store: MutableStoredWorkspace,
): MutableStoredWorkspace {
  return JSON.parse(JSON.stringify(store)) as MutableStoredWorkspace
}

async function createAndBindPatch(
  fixture: ReviewFixture,
  threadId: string,
  turnId: string,
  interactionId: string,
) {
  const session = await fixture.controller.createAssignmentProposalSession({
    courseId: fixture.courseId,
    selectedMaterials: [
      { rawMaterialId: fixture.notice.id, digest: fixture.notice.digest },
      { rawMaterialId: fixture.syllabus.id, digest: fixture.syllabus.digest },
    ],
    runtime: { threadId, turnId },
  })
  const patch = await session.mcpTool.invoke(
    validPatchPayload(session.context, fixture.notice, fixture.syllabus),
  )
  const binding = await fixture.controller.bindAssignmentReview({
    type: 'user_input.requested',
    threadId,
    turnId,
    itemId: `question-${interactionId}`,
    interactionId,
    questions: [ASSIGNMENT_REVIEW_QUESTION],
  })
  assert.ok(binding)
  return { binding, patch, session }
}

function validPatchPayload(
  context: {
    readonly requestKey: string
    readonly workspaceId: string
    readonly courseId: string
    readonly baseRevision: number
  },
  notice: { readonly id: string; readonly digest: string },
  syllabus: { readonly id: string; readonly digest: string },
) {
  return {
    requestKey: context.requestKey,
    workspaceId: context.workspaceId,
    courseId: context.courseId,
    baseRevision: context.baseRevision,
    summary: '개요 작성하기 과제 정보를 선택 자료에서 정리합니다.',
    changes: {
      operation: 'assignment.upsert',
      values: {
        title: '개요 작성하기',
        dueAt: '2026-07-12T23:59:00+09:00',
        submissionMethod: 'LMS 과제함 업로드',
      },
    },
    evidence: [
      {
        field: 'title',
        rawMaterialId: syllabus.id,
        digest: syllabus.digest,
        quote: '과제: 개요 작성하기',
      },
      {
        field: 'dueAt',
        rawMaterialId: notice.id,
        digest: notice.digest,
        quote: 'RFC 3339 마감 시각은 2026-07-12T23:59:00+09:00입니다.',
      },
      {
        field: 'submissionMethod',
        rawMaterialId: syllabus.id,
        digest: syllabus.digest,
        quote: '제출 방식: LMS 과제함 업로드',
      },
    ],
  }
}

function requireMaterial(
  workspace: Extract<
    Awaited<ReturnType<ReturnType<typeof createSemesterWorkspaceController>['createCourse']>>,
    { state: 'ready' }
  >,
  relativePath: string,
) {
  const material = workspace.materials.find(
    (candidate) => candidate.relativePath === relativePath,
  )
  assert.ok(material)
  return material
}
