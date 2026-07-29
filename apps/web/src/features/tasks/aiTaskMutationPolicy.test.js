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
  ])('%s 이후 진행 중인 AI 할 일은 수정과 삭제를 잠근다', (status) => {
    expect(getAiTaskMutationPolicy(task, members, [run(status)])).toMatchObject({
      canEdit: false,
      canDelete: false,
      canChangeStatus: false,
      reason: 'ai_started',
    })
  })

  test('실행 이력이 없는 시작 전 AI 할 일만 수정과 삭제를 허용한다', () => {
    expect(getAiTaskMutationPolicy(
      { ...task, status: 'not_started' },
      members,
      [],
    )).toMatchObject({
      canEdit: true,
      canDelete: true,
      canChangeStatus: false,
      reason: 'ai_status_managed',
    })
  })

  test('실행 이력이 없어도 이미 시작된 AI 할 일은 수정과 삭제를 잠근다', () => {
    expect(getAiTaskMutationPolicy(task, members, [])).toMatchObject({
      canEdit: false,
      canDelete: false,
      canChangeStatus: false,
      reason: 'ai_started',
    })
  })

  test('자격 증명 실패로 시작 전 상태가 복원된 AI 할 일은 다시 수정과 삭제가 가능하다', () => {
    expect(getAiTaskMutationPolicy(
      { ...task, status: 'not_started' },
      members,
      [run(AI_RUN_STATUS.FAILED)],
    )).toMatchObject({
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
