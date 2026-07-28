import { useEffect, useMemo, useState } from 'react'
import type { Profile, TaskGroup } from '../types'
import { groupLabels, tasks } from '../data/tasks'
import TaskCard from './TaskCard'
import './Dashboard.css'

const REGIONAL_TAX_OFFICES: Record<string, { name: string; tel: string }> = {
  '서울특별시':    { name: '서울지방국세청', tel: '02-2114-2114' },
  '경기도':        { name: '중부지방국세청', tel: '031-888-4200' },
  '인천광역시':    { name: '인천지방국세청', tel: '032-770-0200' },
  '강원특별자치도': { name: '중부지방국세청', tel: '031-888-4200' },
  '충청북도':      { name: '대전지방국세청', tel: '042-615-2200' },
  '충청남도':      { name: '대전지방국세청', tel: '042-615-2200' },
  '대전광역시':    { name: '대전지방국세청', tel: '042-615-2200' },
  '세종특별자치시': { name: '대전지방국세청', tel: '042-615-2200' },
  '전북특별자치도': { name: '광주지방국세청', tel: '062-236-7200' },
  '전라남도':      { name: '광주지방국세청', tel: '062-236-7200' },
  '광주광역시':    { name: '광주지방국세청', tel: '062-236-7200' },
  '제주특별자치도': { name: '광주지방국세청', tel: '062-236-7200' },
  '경상북도':      { name: '대구지방국세청', tel: '053-661-7200' },
  '대구광역시':    { name: '대구지방국세청', tel: '053-661-7200' },
  '경상남도':      { name: '부산지방국세청', tel: '051-750-7200' },
  '부산광역시':    { name: '부산지방국세청', tel: '051-750-7200' },
  '울산광역시':    { name: '부산지방국세청', tel: '051-750-7200' },
}

interface DashboardProps {
  profile: Profile
  progress: Record<string, { checked: boolean; completedAt: string | null; memo: string }>
  taskIds: string[] | null
  loadingTaskId: string | null
  isLoading: boolean
  apiError: boolean
  onToggle: (taskId: string) => void
  onMemo: (taskId: string, memo: string) => void
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

function Dashboard({ profile, progress, taskIds, loadingTaskId, isLoading, apiError, onToggle, onMemo, onEditProfile, onResetProgress }: DashboardProps) {
  const [selected, setSelected] = useState<FilterOption | null>('all')
  const [region, setRegion] = useState('')
  const [notifPermission, setNotifPermission] = useState<NotificationPermission>(
    typeof Notification !== 'undefined' ? Notification.permission : 'denied'
  )

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
      const checkedA = progress[a.id]?.checked ? 1 : 0
      const checkedB = progress[b.id]?.checked ? 1 : 0
      if (checkedA !== checkedB) return checkedA - checkedB
      const dueA = a.dueDate?.(profile)?.getTime() ?? Infinity
      const dueB = b.dueDate?.(profile)?.getTime() ?? Infinity
      return dueA - dueB
    })
  }, [applicableTasks, selected, profile, progress])

  const urgentTasks = useMemo(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return applicableTasks.filter((task) => {
      if (progress[task.id]?.checked) return false
      const due = task.dueDate?.(profile)
      if (!due) return false
      const dueDay = new Date(due)
      dueDay.setHours(0, 0, 0, 0)
      const diff = Math.round((dueDay.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
      return diff >= 0 && diff <= 7
    })
  }, [applicableTasks, progress, profile])

  function triggerNotifications() {
    if (urgentTasks.length === 0) {
      new Notification('소상공인 폐업 도우미', { body: '현재 마감 임박 항목이 없어요.' })
      return
    }
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    if (urgentTasks.length === 1) {
      const task = urgentTasks[0]
      const dueDay = new Date(task.dueDate!(profile))
      dueDay.setHours(0, 0, 0, 0)
      const diff = Math.round((dueDay.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
      new Notification('소상공인 폐업 도우미', {
        body: `${diff === 0 ? 'D-DAY' : `D-${diff}`} · ${task.title}`,
      })
    } else {
      new Notification('소상공인 폐업 도우미', {
        body: `마감 임박 항목 ${urgentTasks.length}개 — ${urgentTasks.map((t) => t.title).join(', ')}`,
      })
    }
    localStorage.setItem('lastNotifiedDate', new Date().toDateString())
  }

  async function handleRequestNotification() {
    const permission = await Notification.requestPermission()
    setNotifPermission(permission)
    if (permission === 'granted') triggerNotifications()
  }

  // 재방문 시 하루 한 번 자동 알림
  useEffect(() => {
    if (isLoading) return
    if (typeof Notification === 'undefined') return
    if (Notification.permission !== 'granted') return
    if (localStorage.getItem('lastNotifiedDate') === new Date().toDateString()) return
    triggerNotifications()
  }, [isLoading]) // eslint-disable-line react-hooks/exhaustive-deps

  const completedCount = applicableTasks.filter((task) => progress[task.id]?.checked).length
  const progressPct = applicableTasks.length
    ? Math.round((completedCount / applicableTasks.length) * 100)
    : 0

  return (
    <div className="dashboard">
      <header className="dashboard__topbar">
        <span className="dashboard__brand">소상공인 폐업 도우미</span>
        <div className="dashboard__topbar-actions">
          {'Notification' in window && notifPermission !== 'denied' && (
            <button
              type="button"
              className="dashboard__pill-btn dashboard__pill-btn--outline"
              onClick={notifPermission === 'granted' ? triggerNotifications : handleRequestNotification}
            >
              {notifPermission === 'granted' ? '알림 확인' : '알림 받기'}
            </button>
          )}
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
          <div className="dashboard__tax-office">
            <p className="dashboard__contacts-title">관할 세무서 찾기</p>
            <select
              className="dashboard__region-select"
              value={region}
              onChange={(e) => setRegion(e.target.value)}
            >
              <option value="">시/도 선택</option>
              {Object.keys(REGIONAL_TAX_OFFICES).map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
            {region && REGIONAL_TAX_OFFICES[region] && (
              <div className="dashboard__tax-office-result">
                <span>{REGIONAL_TAX_OFFICES[region].name}</span>
                <div className="dashboard__tax-office-actions">
                  <a
                    href={`https://map.naver.com/v5/search/${encodeURIComponent(REGIONAL_TAX_OFFICES[region].name)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="dashboard__tax-office-map"
                  >
                    지도 보기
                  </a>
                  <a href={`tel:${REGIONAL_TAX_OFFICES[region].tel.replace(/-/g, '')}`}>
                    {REGIONAL_TAX_OFFICES[region].tel}
                  </a>
                </div>
              </div>
            )}
          </div>

          <div className="dashboard__contacts">
            <p className="dashboard__contacts-title">관련 전화번호</p>
            <ul className="dashboard__contacts-list">
              <li><span>홈택스 (국세청)</span><a href="tel:126">126</a></li>
              <li><span>소상공인시장진흥공단</span><a href="tel:1357">1357</a></li>
              <li><span>고용보험 (근로복지공단)</span><a href="tel:1350">1350</a></li>
              <li><span>4대보험 (정보연계센터)</span><a href="tel:15778778">1577-8778</a></li>
              <li><span>정부24</span><a href="tel:15882188">1588-2188</a></li>
            </ul>
          </div>
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
                  checked={Boolean(progress[task.id]?.checked)}
                  completedAt={progress[task.id]?.completedAt ?? null}
                  memo={progress[task.id]?.memo ?? ''}
                  isLoading={loadingTaskId === task.id}
                  onToggle={onToggle}
                  onMemo={onMemo}
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
