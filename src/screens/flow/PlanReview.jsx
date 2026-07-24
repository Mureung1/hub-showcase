import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import logo from '../../assets/logo.png'
import { formatKorean } from '../../utils/dates'
import { getTypeById } from '../../data/templates'
import { useApi } from '../../api/client'
import './flow.css'

/* AI 계획 검토 — 생성자 전용. 위저드 제출 직후 착지해 확정 전에 계획을 살펴보는 화면.
   서버(GET /api/projects/:id/plan)가 만든 실 계획을 조회해 표시한다.
   인라인 수정은 로컬 상태로만 반영되며 저장·재생성·확정 저장은 다음 슬라이스에서 붙인다. */
export default function PlanReview() {
  const navigate = useNavigate()
  const { id } = useParams()
  const { loading, error, data, reload } = useApi(`/api/projects/${id}/plan`)

  // 편집용 로컬 상태 — 서버 계획이 도착하면 시드한다
  const [plan, setPlan] = useState({ roles: [], milestones: [] })
  const [notice, setNotice] = useState('')

  useEffect(() => {
    if (data) setPlan({ roles: data.roles, milestones: data.milestones })
  }, [data])

  if (loading) {
    return (
      <div className="flow-page">
        <div className="flow-card flow-center">
          <h2>계획을 불러오는 중…</h2>
          <p className="flow-muted">역할과 일정을 준비하고 있어요.</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flow-page">
        <div className="flow-card flow-center">
          <h2>계획을 불러오지 못했습니다</h2>
          <p className="flow-muted">{error}</p>
          <button type="button" className="btn btn-ghost" onClick={reload}>다시 시도</button>
        </div>
      </div>
    )
  }

  const project = data.project
  const typeLabel = getTypeById(project.typeHint)?.label ?? '선택 안 함'
  const roleName = (roleId) => plan.roles.find((r) => r.id === roleId)?.name ?? '미지정'
  const taskTotal = plan.milestones.reduce((sum, m) => sum + m.tasks.length, 0)

  function editRole(roleId, name) {
    setPlan((p) => ({
      ...p,
      roles: p.roles.map((r) => (r.id === roleId ? { ...r, name } : r)),
    }))
  }

  function editMilestone(milestoneId, title) {
    setPlan((p) => ({
      ...p,
      milestones: p.milestones.map((m) => (m.id === milestoneId ? { ...m, title } : m)),
    }))
  }

  function editTask(milestoneId, taskId, title) {
    setPlan((p) => ({
      ...p,
      milestones: p.milestones.map((m) =>
        m.id !== milestoneId
          ? m
          : { ...m, tasks: m.tasks.map((t) => (t.id === taskId ? { ...t, title } : t)) },
      ),
    }))
  }

  function handleRegenerate() {
    // 재생성(3회 제한)은 다음 슬라이스에서 서버로 구현 — 지금은 안내만
    setNotice('“다시 제안받기”(재생성)는 다음 단계에서 제공됩니다.')
  }

  function handleConfirm() {
    // 초대 화면은 아직 목업 — 다음 슬라이스에서 계획 확정·초대 토큰 발급으로 교체
    navigate(`/projects/${id}/invite`)
  }

  return (
    <div className="flow-page">
      <header className="flow-top">
        <img src={logo} alt="" />
        <span>AI 계획 검토</span>
      </header>

      <div className="flow-card">
        <h1>{project.title}</h1>
        <p className="flow-muted">{project.topic}</p>
        <div className="flow-meta">
          <span className="flow-chip">{typeLabel}</span>
          <span className="flow-chip">마감 {formatKorean(project.deadline)}</span>
          <span className="flow-chip">{project.headcount}명</span>
          <span className="flow-chip">마일스톤 {plan.milestones.length} · 태스크 {taskTotal}</span>
        </div>

        <p className="flow-notice">
          AI가 제안한 계획입니다. 역할 이름·마일스톤·태스크를 직접 눌러 수정할 수 있어요.
          확정하면 팀원 초대 링크가 발급됩니다.
        </p>

        <section className="flow-section">
          <div className="flow-section-head">
            <h2>역할 정의</h2>
            <span className="flow-muted">{plan.roles.length}개 역할</span>
          </div>
          <div className="role-grid">
            {plan.roles.map((r) => (
              <div key={r.id} className="role-card">
                <div className="role-card-top">
                  <span className="role-emoji" aria-hidden="true">{r.emoji}</span>
                  <input
                    className="flow-edit"
                    value={r.name}
                    onChange={(e) => editRole(r.id, e.target.value)}
                    aria-label={`${r.name} 역할 이름`}
                  />
                  <span className="role-count">{r.min}~{r.max}명</span>
                </div>
                <p className="role-desc">{r.description}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="flow-section">
          <div className="flow-section-head">
            <h2>마일스톤 · 태스크</h2>
            <span className="flow-muted">기피 날짜 {project.avoidCount}일을 제외한 일정</span>
          </div>
          <ol className="timeline">
            {plan.milestones.map((m) => (
              <li key={m.id} className="timeline-item">
                <span className="timeline-dot" aria-hidden="true" />
                <div className="timeline-head">
                  <input
                    className="flow-edit"
                    value={m.title}
                    onChange={(e) => editMilestone(m.id, e.target.value)}
                    aria-label={`${m.title} 마일스톤 이름`}
                  />
                  <span className="timeline-due">{formatKorean(m.dueDate)}까지</span>
                </div>
                <ul className="task-list">
                  {m.tasks.map((t) => (
                    <li key={t.id} className="task-row">
                      <span className="task-role">{roleName(t.roleId)}</span>
                      <input
                        className="flow-edit"
                        value={t.title}
                        onChange={(e) => editTask(m.id, t.id, e.target.value)}
                        aria-label={`${t.title} 태스크 이름`}
                      />
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ol>
        </section>

        {notice && <p className="flow-notice">{notice}</p>}

        <div className="flow-actions">
          <div className="regen-row">
            <button type="button" className="btn btn-ghost" onClick={handleRegenerate}>
              다시 제안받기
            </button>
            <span className="regen-count">재생성은 다음 단계에서 제공됩니다</span>
          </div>

          <button type="button" className="btn btn-dark" onClick={handleConfirm}>
            이대로 확정
          </button>
        </div>
      </div>
    </div>
  )
}
