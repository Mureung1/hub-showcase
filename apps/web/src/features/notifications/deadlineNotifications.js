import { TASK_STATUS } from '@teamflow/shared'

const DAY_IN_MS = 24 * 60 * 60 * 1000
const UPCOMING_DAY_LIMIT = 3

function calendarDateParts(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value ?? ''))
  if (!match) return null
  return {
    year: Number(match[1]),
    month: Number(match[2]),
    day: Number(match[3]),
  }
}

function calendarDayNumber(value) {
  const parts = calendarDateParts(value)
  return parts ? Math.floor(Date.UTC(parts.year, parts.month - 1, parts.day) / DAY_IN_MS) : null
}

function localCalendarDate(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function deadlineLabel(daysUntilDue) {
  if (daysUntilDue < 0) return `${Math.abs(daysUntilDue)}일 지남`
  if (daysUntilDue === 0) return '오늘 마감'
  if (daysUntilDue === 1) return '내일 마감'
  return `D-${daysUntilDue}`
}

function deadlineTone(daysUntilDue) {
  if (daysUntilDue < 0) return 'overdue'
  if (daysUntilDue === 0) return 'today'
  return 'upcoming'
}

/**
 * Builds actionable, user-specific deadline notifications from the hydrated store.
 * Notifications are derived rather than persisted, so completing a task removes it
 * without maintaining a second read model.
 */
export function selectDeadlineNotifications(state, now = new Date()) {
  const today = calendarDayNumber(localCalendarDate(now))
  const projectById = new Map((state.projects ?? []).map((project) => [project.id, project]))

  return (state.tasks ?? [])
    .flatMap((task) => {
      const currentMemberId = state.currentMemberIdsByProject?.[task.projectId]
        ?? (state.accessMode === 'guest' ? state.currentUserId : null)
      const dueDay = calendarDayNumber(task.dueDate)
      if (
        !currentMemberId
        || task.assigneeId !== currentMemberId
        || task.status === TASK_STATUS.COMPLETED
        || dueDay === null
      ) return []

      const daysUntilDue = dueDay - today
      if (daysUntilDue > UPCOMING_DAY_LIMIT) return []

      return [{
        id: `task-deadline:${task.id}`,
        taskId: task.id,
        projectId: task.projectId,
        projectName: projectById.get(task.projectId)?.name ?? '프로젝트',
        taskTitle: task.title,
        dueDate: task.dueDate,
        daysUntilDue,
        label: deadlineLabel(daysUntilDue),
        tone: deadlineTone(daysUntilDue),
      }]
    })
    .sort((left, right) => (
      left.daysUntilDue - right.daysUntilDue
      || left.taskTitle.localeCompare(right.taskTitle, 'ko')
      || left.taskId.localeCompare(right.taskId)
    ))
}
