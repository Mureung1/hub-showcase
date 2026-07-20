import assert from 'node:assert/strict'
import { mkdir } from 'node:fs/promises'
import path from 'node:path'
import test from 'node:test'

import { DeterministicCodexProductRuntime } from '@ay-ple/codex-chat-runtime/testing'

import { createSemesterWorkspaceController } from './semester-workspace.js'
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
    assert.deepEqual(
      patch.evidence.map(({ field, quote }) => ({ field, quote })),
      [
        { field: 'dueAt', quote: 'RFC 3339 마감 시각은 2026-07-12T23:59:00+09:00입니다.' },
        { field: 'submissionMethod', quote: '제출 방식: LMS 과제함 업로드' },
        { field: 'title', quote: '과제: 개요 작성하기' },
      ],
    )
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
      plan: { model: 'gpt-5', reasoningEffort: 'medium' },
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
    assert.equal((await events.next()).value?.type, 'agent_message.completed')
    assert.equal((await events.next()).value?.type, 'turn.completed')
    assert.equal((await events.next()).done, true)

    const reopenedController = createSemesterWorkspaceController({
      packageRoot,
      appDataRoot,
      chooseDirectory: async () => materialized.workspaceRoot,
    })
    await reopenedController.activate()
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
