import { useState } from 'react'
import type { Profile, Task } from '../types'
import './TaskCard.css'

interface TaskCardProps {
  task: Task
  profile: Profile
  checked: boolean
  completedAt?: string | null
  isLoading?: boolean
  onToggle: (taskId: string) => void
}

// 오늘부터 dueDate까지 남은 일수 계산. 음수면 마감 지남
function daysUntil(dueDate: Date): number {
  const today = new Date()
  today.setHours(0, 0, 0, 0) // 시간을 00:00:00으로 맞춰 날짜 단위로만 비교
  const due = new Date(dueDate)
  due.setHours(0, 0, 0, 0)
  return Math.round((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
}

// diffDays를 "D-7", "D-DAY", "D+3 지남" 형태 문자열로 변환
function formatDday(diffDays: number): string {
  if (diffDays === 0) return 'D-DAY'
  if (diffDays > 0) return `D-${diffDays}`
  return `D+${Math.abs(diffDays)} 지남`
}

function formatCompletedAt(iso: string): string {
  const d = new Date(iso)
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일 처리완료`
}

function TaskCard({ task, profile, checked, completedAt, isLoading = false, onToggle }: TaskCardProps) {
  const [docChecks, setDocChecks] = useState<boolean[]>(
    () => (task.documents ?? []).map(() => false)
  )

  function toggleDoc(i: number) {
    setDocChecks((prev) => prev.map((v, j) => (j === i ? !v : v)))
  }
  // dueDate 함수가 없는 항목(예: 교육 정보)은 배지를 표시하지 않음
  const dueDate = task.dueDate?.(profile)
  const diffDays = dueDate ? daysUntil(dueDate) : null
  // 7일 이내일 때만 urgent 스타일 적용 — 모든 배지를 빨강으로 칠하지 않는다
  const isUrgent = diffDays !== null && diffDays <= 7

  return (
    <article className={`task-card${checked ? ' task-card--checked' : ''}`}>
      <label className="task-card__checkbox">
        <input
          type="checkbox"
          checked={checked}
          disabled={isLoading}
          onChange={() => onToggle(task.id)}
        />
        {isLoading && <span className="task-card__spinner" />}
      </label>

      <div className="task-card__body">
        <div className="task-card__header">
          <h3>{task.title}</h3>
          {diffDays !== null && (
            <span className={`task-card__dday${isUrgent ? ' task-card__dday--urgent' : ''}`}>
              {formatDday(diffDays)}
            </span>
          )}
        </div>
        {/* 이 항목이 왜 나에게 해당하는지 근거 표시 (예: "직원이 있다고 답하셔서...") */}
        <p className="task-card__reason">{task.reason(profile)}</p>
        <p className="task-card__description">{task.description}</p>
        {task.documents && task.documents.length > 0 && (
          <ul className="task-card__docs">
            {task.documents.map((doc, i) => (
              <li key={i} className="task-card__doc">
                <label className={`task-card__doc-label${docChecks[i] ? ' task-card__doc-label--done' : ''}`}>
                  <input
                    type="checkbox"
                    className="task-card__doc-check"
                    checked={docChecks[i]}
                    onChange={() => toggleDoc(i)}
                  />
                  {doc}
                </label>
              </li>
            ))}
          </ul>
        )}
        <a href={task.sourceUrl} target="_blank" rel="noreferrer" className="task-card__source">
          {task.sourceLabel}에서 확인하기
        </a>
        <p className="task-card__updated">최종 확인일: {task.lastCheckedDate}</p>
        {checked && completedAt && (
          <p className="task-card__completed-at">{formatCompletedAt(completedAt)}</p>
        )}
      </div>
    </article>
  )
}

export default TaskCard
