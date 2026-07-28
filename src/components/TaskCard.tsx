import { useState, useEffect, useRef } from 'react'
import type { Profile, Task } from '../types'
import './TaskCard.css'

interface TaskCardProps {
  task: Task
  profile: Profile
  checked: boolean
  completedAt?: string | null
  memo?: string
  isLoading?: boolean
  onToggle: (taskId: string) => void
  onMemo?: (taskId: string, memo: string) => void
}

// 오늘부터 dueDate까지 남은 일수 계산. 음수면 마감 지남
function daysUntil(dueDate: Date): number {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const due = new Date(dueDate)
  due.setHours(0, 0, 0, 0)
  return Math.round((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
}

function formatDday(diffDays: number): string {
  if (diffDays === 0) return 'D-DAY'
  if (diffDays > 0) return `D-${diffDays}`
  return `D+${Math.abs(diffDays)} 지남`
}

function formatCompletedAt(iso: string): string {
  const d = new Date(iso)
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일 처리완료`
}

function TaskCard({ task, profile, checked, completedAt, memo = '', isLoading = false, onToggle, onMemo }: TaskCardProps) {
  const [docChecks, setDocChecks] = useState<boolean[]>(
    () => (task.documents ?? []).map(() => false)
  )
  const [memoText, setMemoText] = useState(memo)
  const [saved, setSaved] = useState(false)
  const isFocusedRef = useRef(false)

  // 서버에서 memo 로드 완료 시 로컬 상태 동기화 (포커스 중엔 덮어쓰지 않음)
  useEffect(() => {
    if (!isFocusedRef.current) setMemoText(memo)
  }, [memo])

  function toggleDoc(i: number) {
    setDocChecks((prev) => prev.map((v, j) => (j === i ? !v : v)))
  }

  function handleMemoBlur() {
    isFocusedRef.current = false
    if (memoText === memo) return
    onMemo?.(task.id, memoText)
    setSaved(true)
    setTimeout(() => setSaved(false), 1500)
  }

  const dueDate = task.dueDate?.(profile)
  const diffDays = dueDate ? daysUntil(dueDate) : null
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
        <div className="task-card__memo">
          <textarea
            className="task-card__memo-input"
            placeholder="메모"
            value={memoText}
            rows={2}
            onChange={(e) => setMemoText(e.target.value)}
            onFocus={() => { isFocusedRef.current = true }}
            onBlur={handleMemoBlur}
          />
          {saved && <span className="task-card__memo-saved">저장됨</span>}
        </div>
      </div>
    </article>
  )
}

export default TaskCard
