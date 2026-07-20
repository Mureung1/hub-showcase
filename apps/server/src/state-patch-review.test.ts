import assert from 'node:assert/strict'
import { mkdir } from 'node:fs/promises'
import path from 'node:path'
import test from 'node:test'

import { createSemesterWorkspaceController } from './semester-workspace.js'
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
