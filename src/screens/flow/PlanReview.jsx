import { useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router'
import logo from '../../assets/logo.png'
import { formatKorean } from '../../utils/dates'
import {
  DEMO_PROJECT_ID,
  MAX_REGENERATE,
  buildPlan,
  fallbackProject,
  typeLabelOf,
} from './flowMock'
import './flow.css'

/* AI 계획 검토 — 생성자 전용. 위저드 제출 직후 착지해 확정 전에 계획을 손보는 화면.
   지금은 templates.js의 목 계획을 쓰고, 4단계에서 플래너 에이전트 응답으로 교체된다. */
export default function PlanReview() {
  const navigate = useNavigate()
  const { state } = useLocation()

  // 위저드에서 넘어온 입력이 없으면(주소창 직접 진입·새로고침) 기본값으로 렌더링
  const project = useMemo(() => ({ ...fallbackProject(), ...(state ?? {}) }), [state])

  const [regenCount, setRegenCount] = useState(0)
  const [plan, setPlan] = useState(() => buildPlan(project.typeHint, 0, project.deadline))
  const [edited, setEdited] = useState(false)

  const roleName = (roleId) => plan.roles.find((r) => r.id === roleId)?.name ?? '미지정'
  const remaining = MAX_REGENERATE - regenCount
  const taskTotal = plan.milestones.reduce((sum, m) => sum + m.tasks.length, 0)

  function handleRegenerate() {
    if (remaining <= 0) return
    if (edited && !window.confirm('직접 수정한 내용이 사라집니다. 다시 제안받을까요?')) return
    const next = regenCount + 1
    setRegenCount(next)
    setPlan(buildPlan(project.typeHint, next, project.deadline))
    setEdited(false)
  }

  function editRole(roleId, name) {
    setEdited(true)
    setPlan((p) => ({
      ...p,
      roles: p.roles.map((r) => (r.id === roleId ? { ...r, name } : r)),
    }))
  }

  function editMilestone(milestoneId, title) {
    setEdited(true)
    setPlan((p) => ({
      ...p,
      milestones: p.milestones.map((m) => (m.id === milestoneId ? { ...m, title } : m)),
    }))
  }

  function editTask(milestoneId, taskId, title) {
    setEdited(true)
    setPlan((p) => ({
      ...p,
      milestones: p.milestones.map((m) =>
        m.id !== milestoneId
          ? m
          : { ...m, tasks: m.tasks.map((t) => (t.id === taskId ? { ...t, title } : t)) },
      ),
    }))
  }

  function handleConfirm() {
    // 4단계: 여기서 계획을 저장하고 서버가 초대 토큰을 발급한다
    navigate(`/projects/${DEMO_PROJECT_ID}/invite`, { state: project })
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
          <span className="flow-chip">{typeLabelOf(project.typeHint)}</span>
          <span className="flow-chip">마감 {formatKorean(project.deadline)}</span>
          <span className="flow-chip">{project.headcount}명</span>
          <span className="flow-chip">마일스톤 {plan.milestones.length} · 태스크 {taskTotal}</span>
        </div>

        <p className="flow-notice">
          AI가 제안한 계획입니다. 역할 이름·마일스톤·태스크를 직접 눌러 수정할 수 있어요.
          확정하면 팀원 초대 링크가 발급되고 계획은 더 이상 다시 제안받을 수 없습니다.
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

        <div className="flow-actions">
          <div className="regen-row">
            <button
              type="button"
              className="btn btn-ghost"
              onClick={handleRegenerate}
              disabled={remaining <= 0}
            >
              다시 제안받기
            </button>
            <span className="regen-count">
              {remaining > 0
                ? `${remaining}회 남음 (최대 ${MAX_REGENERATE}회)`
                : '재생성 횟수를 모두 사용했습니다'}
            </span>
          </div>

          <button type="button" className="btn btn-dark" onClick={handleConfirm}>
            이대로 확정
          </button>
        </div>
      </div>
    </div>
  )
}
