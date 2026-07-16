import { useState } from 'react'
import { Link } from 'react-router'
import { useApi } from '../../api/client'
import './tabs.css'

function ProjectCard({ project, onDelete }) {
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
        {project.isCreator && (
          <button type="button" className="btn-danger-ghost" onClick={() => onDelete(project)}>🗑 삭제</button>
        )}
      </div>
    </li>
  )
}

export default function ProjectsTab() {
  const { loading, error, data, reload } = useApi('/api/me/projects')
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

  const { active, completed } = data

  function handleDelete(project) {
    const ok = window.confirm('프로젝트를 삭제하시겠습니까? 삭제된 프로젝트는 복구가 불가능합니다')
    if (ok) setNotice(`"${project.title}" 삭제는 실데이터 연결 단계(4단계)에서 활성화됩니다.`)
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
          {active.map((p) => <ProjectCard key={p.id} project={p} onDelete={handleDelete} />)}
        </ul>
      )}

      <p className="section-label">
        완료된 프로젝트 <span className="count-badge">{completed.length}</span>
      </p>
      {completed.length === 0 ? (
        <p className="card-empty">완료된 프로젝트가 없습니다.</p>
      ) : (
        <ul className="proj-list">
          {completed.map((p) => <ProjectCard key={p.id} project={p} onDelete={handleDelete} />)}
        </ul>
      )}
    </div>
  )
}
