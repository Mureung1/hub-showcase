import { TASK_STATUS } from '@teamflow/shared'
import { describe, expect, test } from 'vitest'

import { selectDeadlineNotifications } from './deadlineNotifications.js'

const state = {
  accessMode: 'authenticated',
  currentUserId: 'member-current',
  currentMemberIdsByProject: { 'project-1': 'member-current' },
  projects: [{ id: 'project-1', name: '마감 테스트 프로젝트' }],
  tasks: [
    { id: 'overdue', projectId: 'project-1', title: '지난 할 일', assigneeId: 'member-current', dueDate: '2026-07-26', status: TASK_STATUS.IN_PROGRESS },
    { id: 'today', projectId: 'project-1', title: '오늘 할 일', assigneeId: 'member-current', dueDate: '2026-07-28', status: TASK_STATUS.NOT_STARTED },
    { id: 'upcoming', projectId: 'project-1', title: '다가오는 할 일', assigneeId: 'member-current', dueDate: '2026-07-31', status: TASK_STATUS.IN_REVIEW },
    { id: 'later', projectId: 'project-1', title: '나중 할 일', assigneeId: 'member-current', dueDate: '2026-08-01', status: TASK_STATUS.NOT_STARTED },
    { id: 'completed', projectId: 'project-1', title: '끝난 할 일', assigneeId: 'member-current', dueDate: '2026-07-20', status: TASK_STATUS.COMPLETED },
    { id: 'other', projectId: 'project-1', title: '남의 할 일', assigneeId: 'member-other', dueDate: '2026-07-28', status: TASK_STATUS.NOT_STARTED },
  ],
}

describe('deadline notifications', () => {
  test('includes only the current user incomplete tasks due within three days or overdue', () => {
    const notifications = selectDeadlineNotifications(state, new Date(2026, 6, 28, 12))

    expect(notifications.map((notification) => notification.taskId)).toEqual([
      'overdue',
      'today',
      'upcoming',
    ])
    expect(notifications.map((notification) => notification.label)).toEqual([
      '2일 지남',
      '오늘 마감',
      'D-3',
    ])
  })

  test('does not notify when the authenticated user has no project member identity', () => {
    expect(selectDeadlineNotifications({
      ...state,
      currentMemberIdsByProject: {},
    }, new Date(2026, 6, 28, 12))).toEqual([])
  })
})
