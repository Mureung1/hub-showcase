import { AI_RUN_STATUS } from '@teamflow/shared'
import { describe, expect, test } from 'vitest'

import { getAiTaskMutationPolicy } from './aiTaskMutationPolicy.js'

const task = {
  id: 'task-ai',
  projectId: 'project-1',
  assigneeId: 'member-ai',
  status: 'in_progress',
}

const members = [{
  id: 'member-ai',
  projectId: 'project-1',
  kind: 'ai',
  isAi: true,
}]

function run(status) {
  return {
    id: `run-${status}`,
    taskId: task.id,
    aiMemberId: task.assigneeId,
    status,
  }
}

describe('AI task mutation policy', () => {
  test.each([
    AI_RUN_STATUS.RUNNING,
    AI_RUN_STATUS.PENDING_REVIEW,
  ])('%s 실행 중에는 내용·담당자·상태·삭제를 모두 잠근다', (status) => {
    expect(getAiTaskMutationPolicy(task, members, [run(status)])).toMatchObject({
      canEdit: false,
      canDelete: false,
      canChangeStatus: false,
      reason: 'active_run',
    })
  })

  test('공유 노트에 반영된 AI 할 일은 완전히 잠근다', () => {
    expect(getAiTaskMutationPolicy(task, members, [run(AI_RUN_STATUS.APPLIED)])).toMatchObject({
      canEdit: false,
      canDelete: false,
      canChangeStatus: false,
      reason: 'applied',
    })
  })

  test.each([
    AI_RUN_STATUS.REJECTED,
    AI_RUN_STATUS.FAILED,
  ])('%s 결과는 내용 수정과 삭제를 허용하지만 상태는 자동 관리한다', (status) => {
    expect(getAiTaskMutationPolicy(task, members, [run(status)])).toMatchObject({
      canEdit: true,
      canDelete: true,
      canChangeStatus: false,
      reason: 'ai_status_managed',
    })
  })

  test('사람이 담당한 할 일은 기존 수동 관리 기능을 유지한다', () => {
    const humanTask = { ...task, assigneeId: 'member-user' }
    const humanMembers = [{ id: 'member-user', kind: 'user', isAi: false }]

    expect(getAiTaskMutationPolicy(humanTask, humanMembers, [])).toEqual({
      canEdit: true,
      canDelete: true,
      canChangeStatus: true,
      message: '',
      reason: null,
    })
  })
})
