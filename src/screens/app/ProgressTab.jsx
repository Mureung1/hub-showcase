import { useState } from 'react'
import { useApi } from '../../api/client'
import { parseDate, toDateInputValue } from '../../utils/dates'
import ProgressRing from './ProgressRing'
import './tabs.css'

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토']

function encouragement(percent) {
  if (percent >= 70) return '이번 주 진행 상황이 아주 좋습니다!'
  if (percent >= 40) return '순조롭게 진행되고 있어요.'
  if (percent > 0) return '이제 막 시작했어요. 화이팅!'
  return '첫 태스크를 시작해 볼까요?'
}

// 참여 잔디 캘린더 — 이번 달 그리드에 활동일을 초록으로 칠한다
function GrassCalendar({ activityDates, deadline }) {
  const today = new Date()
  const year = today.getFullYear()
  const month = today.getMonth()
  const firstWeekday = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const todayStr = toDateInputValue(today)
  const deadlineDate = deadline ? parseDate(deadline) : null
  const activitySet = new Set(activityDates)

  const cells = []
  for (let i = 0; i < firstWeekday; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)

  return (
    <div>
      <p className="cal-month">{year}년 {month + 1}월</p>
      <div className="grass-grid">
        {WEEKDAYS.map((w) => <span key={w} className="g-weekday">{w}</span>)}
        {cells.map((d, i) => {
          if (d === null) return <span key={`empty-${i}`} />
          const dateStr = toDateInputValue(new Date(year, month, d))
          const cls = ['g-day']
          if (activitySet.has(dateStr)) cls.push('g-act')
          if (deadlineDate && dateStr === toDateInputValue(deadlineDate)) cls.push('g-deadline')
          if (dateStr === todayStr) cls.push('g-today')
          return <span key={dateStr} className={cls.join(' ')}>{d}</span>
        })}
      </div>
      <div className="grass-legend">
        <span><i className="dot dot-act" /> 활동한 날</span>
        <span><i className="dot dot-deadline" /> 마감일</span>
      </div>
    </div>
  )
}

const STATUS_CHIP = {
  todo: { label: '진행 전', cls: 'chip-todo' },
  doing: { label: '진행 중', cls: 'chip-doing' },
  done: { label: '완료', cls: 'chip-done' },
}

export default function ProgressTab() {
  const { loading, error, data, reload } = useApi('/api/me/progress')
  const [notice, setNotice] = useState('')

  if (loading) return <div className="tab-page"><p className="tab-status">불러오는 중…</p></div>
  if (error) {
    return (
      <div className="tab-page">
        <p className="tab-status">문제가 발생했습니다: {error}</p>
        <button type="button" className="btn btn-ghost" onClick={reload}>다시 시도</button>
      </div>
    )
  }

  if (!data.project) {
    return (
      <div className="tab-page">
        <h1>프로젝트 진행</h1>
        <p className="tab-sub">내 태스크와 참여 기록을 관리합니다.</p>
        <div className="tab-empty">
          <h2>진행중인 프로젝트가 없습니다.</h2>
          <p>프로젝트에 참여하면 내 태스크가 여기에 표시됩니다.</p>
        </div>
      </div>
    )
  }

  const { project, me, myProgress, taskCounts, activityDates, tasks, uploads } = data
  const doingTasks = tasks.filter((t) => t.status === 'doing')
  const todoTasks = tasks.filter((t) => t.status === 'todo')
  const doneTasks = tasks.filter((t) => t.status === 'done')
  const uploadsByTask = new Map()
  for (const u of uploads) {
    if (!uploadsByTask.has(u.taskId)) uploadsByTask.set(u.taskId, [])
    uploadsByTask.get(u.taskId).push(u)
  }

  return (
    <div className="tab-page">
      <h1>{project.title}</h1>
      <p className="tab-sub">내 작업 현황과 참여 기록입니다.</p>

      <div className="dash-grid">
        <section className="card profile-card">
          <span className="profile-avatar" aria-hidden="true">👤</span>
          <p className="profile-name">
            {me.nickname}
            {me.isLeader && <span className="leader-badge">조장</span>}
          </p>
          <p className="profile-role">{me.roleName ?? '역할 미배정'}</p>
          <div className="stat-row">
            <div className="stat">
              <p className="stat-num">{taskCounts.doing}</p>
              <p className="stat-label">진행 중</p>
            </div>
            <div className="stat">
              <p className="stat-num">{taskCounts.done}</p>
              <p className="stat-label">완료</p>
            </div>
          </div>
        </section>

        <section className="card">
          <div className="card-head"><h2>내 프로젝트 진행률</h2></div>
          <div className="ring-center">
            <ProgressRing percent={myProgress} />
            <p className="ring-note">{encouragement(myProgress)}</p>
          </div>
        </section>

        <section className="card">
          <div className="card-head"><h2>일정</h2></div>
          <GrassCalendar activityDates={activityDates} deadline={project.deadline} />
        </section>
      </div>

      <div className="dash-grid-2">
        <section className="card">
          <div className="card-head"><h2>진행 중 태스크</h2></div>
          {notice && <p className="tab-notice">{notice}</p>}
          {doingTasks.length === 0 ? (
            <p className="card-empty">진행 중인 태스크가 없습니다.</p>
          ) : (
            <ul className="task-list">
              {doingTasks.map((t) => (
                <li key={t.id} className="task-card">
                  <p className="task-title">
                    {t.title} <span className={`status-chip ${STATUS_CHIP.doing.cls}`}>{STATUS_CHIP.doing.label}</span>
                  </p>
                  {t.milestoneTitle && <p className="task-ms">{t.milestoneTitle}</p>}
                  {(uploadsByTask.get(t.id) ?? []).map((u) => (
                    <p key={u.id} className="task-upload">
                      📎 {u.kind === 'link' ? <a href={u.linkUrl} target="_blank" rel="noreferrer">{u.linkUrl}</a> : u.fileName}
                      {u.comment && <span className="upload-comment"> — {u.comment}</span>}
                    </p>
                  ))}
                  <div className="task-input-row">
                    <input type="text" maxLength={100} placeholder="URL 또는 코멘트 추가 (최대 100자)..." />
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      onClick={() => setNotice('업로드는 실데이터 연결 단계(4단계)에서 활성화됩니다.')}
                    >
                      📎 업로드
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="card">
          <div className="card-head"><h2>태스크 요약</h2></div>
          <p className="sum-group">진행 전 태스크</p>
          {todoTasks.length === 0 ? (
            <p className="card-empty">없음</p>
          ) : (
            <ul className="sum-list">
              {todoTasks.map((t) => (
                <li key={t.id} className="sum-item">
                  <span className="sum-title">{t.title}</span>
                  <span className={`status-chip ${STATUS_CHIP.todo.cls}`}>{STATUS_CHIP.todo.label}</span>
                </li>
              ))}
            </ul>
          )}
          <p className="sum-group">완료한 태스크</p>
          {doneTasks.length === 0 ? (
            <p className="card-empty">없음</p>
          ) : (
            <ul className="sum-list">
              {doneTasks.map((t) => (
                <li key={t.id} className="sum-item">
                  <span className="sum-title sum-done">{t.title}</span>
                  <span className={`status-chip ${STATUS_CHIP.done.cls}`}>{STATUS_CHIP.done.label}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  )
}
