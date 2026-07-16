import { Link } from 'react-router'
import { useApi, timeAgo } from '../../api/client'
import { parseDate, diffDays } from '../../utils/dates'
import ProgressRing from './ProgressRing'
import './tabs.css'

const ACTIVITY_ICON = { join: '👋', reveal: '📢', task_status: '✅', upload: '📎', swap: '🔄' }

function activityText(a) {
  switch (a.type) {
    case 'join':
      return `${a.nickname}님이 프로젝트에 합류했습니다.`
    case 'reveal':
      return '역할 배정 결과가 공개되었습니다.'
    case 'task_status': {
      const label = a.payload?.to === 'done' ? '완료했습니다' : a.payload?.to === 'doing' ? '진행 중으로 바꿨습니다' : '진행 전으로 바꿨습니다'
      return `${a.nickname}님이 "${a.payload?.task}" 태스크를 ${label}.`
    }
    case 'upload':
      return `${a.nickname}님이 "${a.payload?.task}"에 자료를 올렸습니다.`
    case 'swap':
      return '역할이 교환되었습니다.'
    default:
      return `${a.nickname}님의 활동`
  }
}

export default function DashboardTab() {
  const { loading, error, data, reload } = useApi('/api/me/dashboard')

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
        <h1>대시보드</h1>
        <p className="tab-sub">메인 프로젝트의 팀 전체 현황을 확인합니다.</p>
        <div className="tab-empty">
          <h2>진행중인 프로젝트가 없습니다.</h2>
          <p>새 프로젝트를 시작해볼까요?</p>
          <Link to="/projects/new" className="btn btn-dark">새 프로젝트 시작하기</Link>
        </div>
      </div>
    )
  }

  const { project, progress, lastWeekProgress, milestones, members, recentActivities } = data
  const dday = diffDays(new Date(), parseDate(project.deadline))
  const delta = lastWeekProgress === null ? null : progress - lastWeekProgress

  return (
    <div className="tab-page">
      <h1>{project.title}</h1>
      <p className="tab-sub">{project.topic}</p>

      <p className="section-label">📊 프로젝트 대시보드</p>

      <div className="dash-grid">
        <section className="card">
          <div className="card-head"><h2>전체 진행률</h2></div>
          <div className="ring-wrap">
            <ProgressRing percent={progress} />
            <div className="ring-side">
              <p className="ring-status">{delta === null || delta >= 0 ? '정상 진행 중' : '분발이 필요해요'}</p>
              {delta !== null && (
                <p className={delta >= 0 ? 'delta-up' : 'delta-down'}>
                  {delta >= 0 ? '↑' : '↓'} 지난주 대비 {Math.abs(delta)}%p {delta >= 0 ? '상승' : '하락'}
                </p>
              )}
            </div>
          </div>
        </section>

        <section className="card">
          <div className="card-head"><h2>남은 기간 (D-DAY)</h2></div>
          <div className="dday-body">
            <p className="dday-num">{dday >= 0 ? `D-${dday}` : `D+${-dday}`}</p>
            <span className="dday-chip">마감일 : {project.deadline.replaceAll('-', '.')}</span>
          </div>
        </section>

        <section className="card">
          <div className="card-head"><h2>마일스톤별 진행률</h2></div>
          <ul className="ms-list">
            {milestones.map((ms) => (
              <li key={ms.id} className="ms-row">
                <div className="ms-top">
                  <span className="ms-title">{ms.title}</span>
                  <span className="ms-pct">{ms.progress}%</span>
                </div>
                <div className="bar-track"><div className="bar-fill" style={{ width: `${ms.progress}%` }} /></div>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <div className="dash-grid-2">
        <section className="card">
          <div className="card-head"><h2>최근 활동</h2></div>
          {recentActivities.length === 0 ? (
            <p className="card-empty">아직 활동 기록이 없습니다.</p>
          ) : (
            <ul className="feed-list">
              {recentActivities.map((a) => (
                <li key={a.id} className="feed-item">
                  <span className="feed-icon" aria-hidden="true">{ACTIVITY_ICON[a.type] ?? '•'}</span>
                  <p className="feed-text">{activityText(a)}</p>
                  <span className="feed-time">{timeAgo(a.createdAt)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="card">
          <div className="card-head"><h2>팀원 목록</h2></div>
          <ul className="member-list">
            {members.map((m, i) => (
              <li key={m.id} className="member-row">
                <span className="member-num">{i + 1}</span>
                <div className="member-info">
                  <p className="member-name">
                    {m.nickname}
                    {m.isLeader && <span className="leader-badge">조장</span>}
                  </p>
                  <p className="member-role">{m.roleName ?? '역할 미배정'}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  )
}
