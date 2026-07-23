import { useMemo, useState } from 'react'
import type { Profile, TaskGroup } from '../types'
import { groupLabels, tasks } from '../data/tasks'
import TaskCard from './TaskCard'
import './Dashboard.css'

interface DashboardProps {
  profile: Profile
  progress: Record<string, boolean>
  taskIds: string[] | null
  loadingTaskId: string | null
  isLoading: boolean
  apiError: boolean
  onToggle: (taskId: string) => void
  onEditProfile: () => void
  onResetProgress: () => void
}

type FilterOption = 'all' | TaskGroup

const filterOptions: { value: FilterOption; label: string }[] = [
  { value: 'all', label: '전체 보기' },
  { value: 'closure', label: groupLabels.closure },
  { value: 'tax', label: groupLabels.tax },
  { value: 'subsidy', label: groupLabels.subsidy },
]

function Dashboard({ profile, progress, taskIds, loadingTaskId, isLoading, apiError, onToggle, onEditProfile, onResetProgress }: DashboardProps) {
  const [selected, setSelected] = useState<FilterOption | null>('all')

  const applicableTasks = useMemo(
    () =>
      taskIds
        ? tasks.filter((task) => taskIds.includes(task.id))
        : tasks.filter((task) => task.condition(profile)),
    [profile, taskIds],
  )

  const countFor = (option: FilterOption) =>
    option === 'all'
      ? applicableTasks.length
      : applicableTasks.filter((task) => task.group === option).length

  const visibleTasks = useMemo(() => {
    if (!selected) return []
    const filtered =
      selected === 'all' ? applicableTasks : applicableTasks.filter((task) => task.group === selected)

    return [...filtered].sort((a, b) => {
      const dueA = a.dueDate?.(profile)?.getTime() ?? Infinity
      const dueB = b.dueDate?.(profile)?.getTime() ?? Infinity
      return dueA - dueB
    })
  }, [applicableTasks, selected, profile])

  const completedCount = applicableTasks.filter((task) => progress[task.id]).length
  const progressPct = applicableTasks.length
    ? Math.round((completedCount / applicableTasks.length) * 100)
    : 0

  return (
    <div className="dashboard">
      <header className="dashboard__topbar">
        <span className="dashboard__brand">소상공인 폐업 도우미</span>
        <div className="dashboard__topbar-actions">
          <button type="button" className="dashboard__pill-btn" onClick={onEditProfile}>
            조건 다시 입력
          </button>
          <button type="button" className="dashboard__pill-btn" onClick={onResetProgress}>
            체크 상태 초기화
          </button>
        </div>
      </header>

      <div className="dashboard__body">
        <nav className="dashboard__sidebar">
          <div className="dashboard__progress-block">
            <p className="dashboard__progress-label">
              전체 진행률 <strong>{completedCount}/{applicableTasks.length}</strong>
            </p>
            <div className="dashboard__progress-bar">
              <div className="dashboard__progress-fill" style={{ width: `${progressPct}%` }} />
            </div>
          </div>

          <ul className="dashboard__categories">
            {filterOptions.map((option) => (
              <li key={option.value}>
                <button
                  type="button"
                  className={`dashboard__category${selected === option.value ? ' active' : ''}`}
                  onClick={() => setSelected(option.value)}
                >
                  <span className="dashboard__category-label">{option.label}</span>
                  <span className="dashboard__category-count">{countFor(option.value)}</span>
                </button>
              </li>
            ))}
          </ul>
        </nav>

        <main className="dashboard__content">
          {apiError && (
            <div className="dashboard__error-banner" role="alert">
              서버에 연결할 수 없습니다. 일부 정보가 표시되지 않을 수 있어요.
            </div>
          )}

          {!selected && (
            <p className="dashboard__placeholder">왼쪽에서 카테고리를 선택해 체크리스트를 확인하세요.</p>
          )}

          {selected && isLoading && (
            <div className="dashboard__checklist">
              {[1, 2, 3].map((i) => (
                <div key={i} className="task-card task-card--skeleton" />
              ))}
            </div>
          )}

          {selected && !isLoading && visibleTasks.length === 0 && (
            <p className="dashboard__placeholder">해당하는 항목이 없어요.</p>
          )}

          {selected && !isLoading && (
            <div className="dashboard__checklist">
              {visibleTasks.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  profile={profile}
                  checked={Boolean(progress[task.id])}
                  isLoading={loadingTaskId === task.id}
                  onToggle={onToggle}
                />
              ))}
            </div>
          )}

          <p className="dashboard__disclaimer">
            본 서비스는 세무·법률 대리 업무를 수행하지 않으며, 정확한 내용은 관할 기관(세무서,
            홈택스, 정부24 등)에서 확인하세요.
          </p>
        </main>
      </div>
    </div>
  )
}

export default Dashboard
