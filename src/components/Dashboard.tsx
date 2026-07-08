import { useMemo, useState } from 'react'
import type { Profile, TaskGroup } from '../types'
import { groupLabels, tasks } from '../data/tasks'
import TaskCard from './TaskCard'
import './Dashboard.css'

interface DashboardProps {
  profile: Profile
  progress: Record<string, boolean>
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

function Dashboard({ profile, progress, onToggle, onEditProfile, onResetProgress }: DashboardProps) {
  const [selected, setSelected] = useState<FilterOption | null>(null)

  const applicableTasks = useMemo(
    () => tasks.filter((task) => task.condition(profile)),
    [profile],
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

  return (
    <main className="dashboard">
      <header className="dashboard__header">
        <div className="dashboard__title-row">
          <h1>소상공인 폐업 도우미</h1>
          <div className="dashboard__header-actions">
            <button type="button" className="dashboard__text-button" onClick={onEditProfile}>
              조건 다시 입력
            </button>
            <button type="button" className="dashboard__text-button" onClick={onResetProgress}>
              체크 상태 초기화
            </button>
          </div>
        </div>
        <p className="dashboard__progress">
          전체 진행률 {completedCount}/{applicableTasks.length} 완료
        </p>
        <div className="dashboard__progress-bar">
          <div
            className="dashboard__progress-fill"
            style={{
              width: applicableTasks.length
                ? `${(completedCount / applicableTasks.length) * 100}%`
                : '0%',
            }}
          />
        </div>
      </header>

      <section className="dashboard__buttons">
        {filterOptions.map((option) => (
          <button
            key={option.value}
            type="button"
            className={`dashboard__feature-button${selected === option.value ? ' active' : ''}`}
            onClick={() => setSelected(option.value)}
          >
            <span className="dashboard__feature-title">{option.label}</span>
            <span className="dashboard__feature-count">{countFor(option.value)}개 항목</span>
          </button>
        ))}
      </section>

      <section className="dashboard__checklist">
        {!selected && (
          <p className="dashboard__placeholder">위 버튼을 눌러 체크리스트를 확인하세요.</p>
        )}

        {selected && visibleTasks.length === 0 && (
          <p className="dashboard__placeholder">해당하는 항목이 없어요.</p>
        )}

        {selected &&
          visibleTasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              profile={profile}
              checked={Boolean(progress[task.id])}
              onToggle={onToggle}
            />
          ))}
      </section>

      <p className="dashboard__disclaimer">
        본 서비스는 세무·법률 대리 업무를 수행하지 않으며, 정확한 내용은 관할 기관(세무서,
        홈택스, 정부24 등)에서 확인하세요.
      </p>
    </main>
  )
}

export default Dashboard
