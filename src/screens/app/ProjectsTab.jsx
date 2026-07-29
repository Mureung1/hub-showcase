import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { useApi, apiPost, apiDelete } from '../../api/client'
import './tabs.css'

function ProjectCard({ project, section, canUp, canDown, busy, onDelete, onComplete, onSetMain, onMove }) {
  const active = section === 'active'
  const navigate = useNavigate()
  return (
    <li className={`proj-card${project.status === 'completed' ? ' proj-done' : ''}`}>
      <div className="proj-info">
        <p className="proj-title">
          {project.title}
          {project.isMain && project.status !== 'completed' && <span className="main-badge">메인 프로젝트</span>}
        </p>
        <p className="proj-topic">{project.topic}</p>
      </div>
      <div className="proj-meta">
        <p className="proj-meta-label">조장</p>
        <p className="proj-meta-value">{project.leaderNickname ?? '-'}</p>
      </div>
      <div className="proj-meta">
        <p className="proj-meta-label">팀원</p>
        <p className="proj-meta-value">{project.memberNicknames.join(', ')}</p>
      </div>
      <div className="proj-progress">
        <div className="proj-progress-top">
          <span className="proj-meta-label">진행률</span>
          <span className="proj-pct">{project.progress}%</span>
        </div>
        <div className="bar-track"><div className="bar-fill" style={{ width: `${project.progress}%` }} /></div>
      </div>
      <div className="proj-actions">
        {project.isCreator && project.status === 'recruiting' && (
          <button type="button" className="btn btn-ghost btn-sm" disabled={busy} onClick={() => navigate(`/projects/${project.id}/invite`)}>🔗 초대 링크</button>
        )}
        {active && !project.isMain && (
          <div className="proj-reorder">
            <button type="button" className="reorder-btn" disabled={busy || !canUp} aria-label="위로" onClick={() => onMove(project, -1)}>↑</button>
            <button type="button" className="reorder-btn" disabled={busy || !canDown} aria-label="아래로" onClick={() => onMove(project, 1)}>↓</button>
          </div>
        )}
        {active && !project.isMain && (
          <button type="button" className="btn btn-ghost btn-sm" disabled={busy} onClick={() => onSetMain(project)}>⭐ 메인 지정</button>
        )}
        {project.isCreator && active && (
          <button type="button" className="btn btn-ghost btn-sm" disabled={busy} onClick={() => onComplete(project, true)}>📁 완료 처리</button>
        )}
        {project.isCreator && !active && (
          <button type="button" className="btn btn-ghost btn-sm" disabled={busy} onClick={() => onComplete(project, false)}>↩ 완료 취소</button>
        )}
        {project.isCreator && (
          <button type="button" className="btn-danger-ghost" disabled={busy} onClick={() => onDelete(project)}>🗑 삭제</button>
        )}
      </div>
    </li>
  )
}

export default function ProjectsTab() {
  const { loading, error, data, reload } = useApi('/api/me/projects')
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)

  if (loading) return <div className="tab-page"><p className="tab-status">불러오는 중…</p></div>
  if (error) {
    return (
      <div className="tab-page">
        <p className="tab-status">문제가 발생했습니다: {error}</p>
        <button type="button" className="btn btn-ghost" onClick={reload}>다시 시도</button>
      </div>
    )
  }

  const { active, completed } = data
  const firstNonMain = active.findIndex((p) => !p.isMain) // 메인은 최상단 고정 → 그 아래에서만 순서 변경

  // 쓰기 요청 공통 래퍼 — 실행 중 버튼 잠금, 성공 시 목록 새로고침, 실패 시 안내
  async function run(fn) {
    setNotice('')
    setBusy(true)
    try {
      await fn()
      reload()
    } catch (err) {
      setNotice(err.message)
    } finally {
      setBusy(false)
    }
  }

  function handleDelete(project) {
    const ok = window.confirm(`"${project.title}" 프로젝트를 삭제하시겠습니까? 삭제된 프로젝트는 복구가 불가능합니다.`)
    if (ok) run(() => apiDelete(`/api/projects/${project.id}`))
  }
  function handleComplete(project, completed) {
    run(() => apiPost(`/api/projects/${project.id}/complete`, { completed }))
  }
  function handleSetMain(project) {
    run(() => apiPost(`/api/projects/${project.id}/main`))
  }
  function handleMove(project, delta) {
    const idx = active.findIndex((p) => p.id === project.id)
    const target = idx + delta
    if (idx < 0 || target < 0 || target >= active.length) return
    const ids = active.map((p) => p.id)
    ;[ids[idx], ids[target]] = [ids[target], ids[idx]]
    run(() => apiPost('/api/me/projects/reorder', { projectIds: ids }))
  }

  return (
    <div className="tab-page">
      <h1>프로젝트 관리</h1>
      <p className="tab-sub">내 프로젝트 목록을 관리합니다.</p>

      {notice && <p className="tab-notice">{notice}</p>}

      <p className="section-label">
        진행중인 프로젝트 <span className="count-badge">{active.length}</span>
      </p>
      {active.length === 0 ? (
        <div className="tab-empty">
          <h2>진행중인 프로젝트가 없습니다.</h2>
          <p>새 프로젝트를 시작해볼까요?</p>
          <Link to="/projects/new" className="btn btn-dark">새 프로젝트 시작하기</Link>
        </div>
      ) : (
        <ul className="proj-list">
          {active.map((p, i) => (
            <ProjectCard
              key={p.id}
              project={p}
              section="active"
              canUp={!p.isMain && i > firstNonMain}
              canDown={!p.isMain && i < active.length - 1}
              busy={busy}
              onDelete={handleDelete}
              onComplete={handleComplete}
              onSetMain={handleSetMain}
              onMove={handleMove}
            />
          ))}
        </ul>
      )}

      <p className="section-label">
        완료된 프로젝트 <span className="count-badge">{completed.length}</span>
      </p>
      {completed.length === 0 ? (
        <p className="card-empty">완료된 프로젝트가 없습니다.</p>
      ) : (
        <ul className="proj-list">
          {completed.map((p) => (
            <ProjectCard
              key={p.id}
              project={p}
              section="completed"
              busy={busy}
              onDelete={handleDelete}
              onComplete={handleComplete}
            />
          ))}
        </ul>
      )}
    </div>
  )
}
