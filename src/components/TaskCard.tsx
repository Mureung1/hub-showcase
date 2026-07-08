import type { Profile, Task } from '../types'
import './TaskCard.css'

interface TaskCardProps {
  task: Task
  profile: Profile
  checked: boolean
  onToggle: (taskId: string) => void
}

function formatDday(dueDate: Date): string {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const due = new Date(dueDate)
  due.setHours(0, 0, 0, 0)
  const diffDays = Math.round((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

  if (diffDays === 0) return 'D-DAY'
  if (diffDays > 0) return `D-${diffDays}`
  return `D+${Math.abs(diffDays)} 지남`
}

function TaskCard({ task, profile, checked, onToggle }: TaskCardProps) {
  const dueDate = task.dueDate?.(profile)

  return (
    <article className={`task-card${checked ? ' task-card--checked' : ''}`}>
      <label className="task-card__checkbox">
        <input type="checkbox" checked={checked} onChange={() => onToggle(task.id)} />
      </label>

      <div className="task-card__body">
        <div className="task-card__header">
          <h3>{task.title}</h3>
          {dueDate && <span className="task-card__dday">{formatDday(dueDate)}</span>}
        </div>
        <p className="task-card__reason">{task.reason(profile)}</p>
        <p className="task-card__description">{task.description}</p>
        <a href={task.sourceUrl} target="_blank" rel="noreferrer" className="task-card__source">
          {task.sourceLabel}에서 확인하기
        </a>
        <p className="task-card__updated">최종 확인일: {task.lastCheckedDate}</p>
      </div>
    </article>
  )
}

export default TaskCard
