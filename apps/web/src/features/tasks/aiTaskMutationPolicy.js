import { AI_RUN_STATUS, TASK_STATUS } from '@teamflow/shared'

const ACTIVE_RUN_STATUSES = new Set([
  AI_RUN_STATUS.RUNNING,
  AI_RUN_STATUS.PENDING_REVIEW,
])

export function getAiTaskMutationPolicy(task, members, aiRuns) {
  const taskRuns = aiRuns.filter((run) => run.taskId === task.id)
  if (taskRuns.some((run) => run.status === AI_RUN_STATUS.APPLIED)) {
    return {
      canEdit: false,
      canDelete: false,
      canChangeStatus: false,
      message: '공유 노트에 반영된 AI 할 일은 변경하거나 삭제할 수 없습니다.',
      reason: 'applied',
    }
  }

  if (taskRuns.some((run) => ACTIVE_RUN_STATUSES.has(run.status))) {
    return {
      canEdit: false,
      canDelete: false,
      canChangeStatus: false,
      message: 'AI 작업이 진행 중이거나 검토 대기 중인 할 일은 변경하거나 삭제할 수 없습니다.',
      reason: 'active_run',
    }
  }

  const assignee = members.find((member) => member.id === task.assigneeId)
  if (assignee?.kind === 'ai' || assignee?.isAi) {
    if (task.status !== TASK_STATUS.NOT_STARTED) {
      return {
        canEdit: false,
        canDelete: false,
        canChangeStatus: false,
        message: '시작된 AI 할 일은 수정하거나 삭제할 수 없습니다.',
        reason: 'ai_started',
      }
    }

    return {
      canEdit: true,
      canDelete: true,
      canChangeStatus: false,
      message: 'AI Agent가 담당한 할 일의 진행 상태는 실행 흐름에서 자동으로 변경됩니다.',
      reason: 'ai_status_managed',
    }
  }

  return {
    canEdit: true,
    canDelete: true,
    canChangeStatus: true,
    message: '',
    reason: null,
  }
}
