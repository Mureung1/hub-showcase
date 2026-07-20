import { useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router'
import logo from '../../assets/logo.png'
import { getRolesForType } from '../../data/templates'
import { DEMO_PROJECT_ID, fallbackProject, makeMembers } from './flowMock'
import './flow.css'

/* 팀원 설문 — 배정 점수의 입력값을 모은다. 응답은 비공개(팀원끼리 서로 못 봄).
   4단계에서 제출은 surveys 테이블 INSERT로, 제출 현황은 폴링으로 교체된다. */
export default function Survey() {
  const navigate = useNavigate()
  const { state } = useLocation()

  const project = useMemo(() => ({ ...fallbackProject(), ...(state ?? {}) }), [state])
  const roles = useMemo(() => getRolesForType(project.typeHint), [project.typeHint])
  const members = useMemo(() => makeMembers(project.headcount), [project.headcount])

  const [answer, setAnswer] = useState({
    preferences: [], // 순서가 곧 1·2·3순위
    avoid: null,
    experience: [],
    leader: 'any',
  })
  const [submitted, setSubmitted] = useState(false)

  /* 나를 제외한 팀원 중 1명은 아직 미제출 — 정원 미달 마감 상황을 확인하기 위한 목업 */
  const othersSubmitted = Math.max(project.headcount - 2, 0)
  const submittedCount = othersSubmitted + (submitted ? 1 : 0)

  function togglePreference(roleId) {
    setAnswer((a) => {
      if (a.preferences.includes(roleId)) {
        return { ...a, preferences: a.preferences.filter((id) => id !== roleId) }
      }
      if (a.preferences.length >= 3) return a // 3순위까지만
      return { ...a, preferences: [...a.preferences, roleId] }
    })
  }

  function toggleExperience(roleId) {
    setAnswer((a) => ({
      ...a,
      experience: a.experience.includes(roleId)
        ? a.experience.filter((id) => id !== roleId)
        : [...a.experience, roleId],
    }))
  }

  function setAvoid(roleId) {
    setAnswer((a) => ({
      ...a,
      avoid: a.avoid === roleId ? null : roleId,
      // 기피로 고른 역할은 선호에서 자동 제외 (모순 방지)
      preferences: a.preferences.filter((id) => id !== roleId),
    }))
  }

  function handleClose() {
    // 생성자 수동 마감 — 정원 미달이면 인원을 줄일지 확인받는다
    if (submittedCount < project.headcount) {
      const ok = window.confirm(
        `현재 ${project.headcount}명 중 ${submittedCount}명이 설문에 참여하였습니다. ` +
        `전체 참여 인원을 ${submittedCount}명으로 수정할까요?`,
      )
      if (!ok) return
    }
    navigate(`/projects/${DEMO_PROJECT_ID}/result`, {
      state: { ...project, headcount: submittedCount, mySurvey: answer },
    })
  }

  const rankOf = (roleId) => answer.preferences.indexOf(roleId) + 1

  return (
    <div className="flow-page">
      <header className="flow-top">
        <img src={logo} alt="" />
        <span>역할 설문</span>
      </header>

      <div className="flow-card">
        <h1>{project.title}</h1>
        <p className="flow-muted">
          응답은 <strong>비공개</strong>입니다. 팀원끼리 서로의 답변을 볼 수 없고,
          배정 결과에는 팀 전체 통계만 표시됩니다.
        </p>

        <div className="survey-status">
          <div className="join-status-head">
            <strong>제출 현황</strong>
            <span>{submittedCount} / {project.headcount}명</span>
          </div>
          <div className="slot-list">
            {members.map((m, i) => (
              <span key={m.id} className={`slot${i < submittedCount ? ' filled' : ''}`}>
                {i < submittedCount ? '제출 완료' : '대기 중'}
              </span>
            ))}
          </div>
        </div>

        <section className="flow-section">
          <div className="flow-section-head">
            <h2>1. 맡고 싶은 역할</h2>
            <span className="flow-muted">누른 순서대로 1~3순위 ({answer.preferences.length}/3)</span>
          </div>
          <div className="chip-grid">
            {roles.map((r) => {
              const rank = rankOf(r.id)
              const disabled = answer.avoid === r.id
              return (
                <button
                  key={r.id}
                  type="button"
                  className={`survey-chip${rank ? ' picked' : ''}`}
                  onClick={() => togglePreference(r.id)}
                  disabled={disabled}
                  aria-pressed={rank > 0}
                >
                  <span aria-hidden="true">{r.emoji}</span>
                  {r.name}
                  {rank > 0 && <em className="rank">{rank}순위</em>}
                </button>
              )
            })}
          </div>
        </section>

        <section className="flow-section">
          <div className="flow-section-head">
            <h2>2. 피하고 싶은 역할</h2>
            <span className="flow-muted">최대 1개 (선택)</span>
          </div>
          <div className="chip-grid">
            {roles.map((r) => (
              <button
                key={r.id}
                type="button"
                className={`survey-chip${answer.avoid === r.id ? ' avoided' : ''}`}
                onClick={() => setAvoid(r.id)}
                aria-pressed={answer.avoid === r.id}
              >
                <span aria-hidden="true">{r.emoji}</span>
                {r.name}
              </button>
            ))}
          </div>
        </section>

        <section className="flow-section">
          <div className="flow-section-head">
            <h2>3. 경험이 있는 역할</h2>
            <span className="flow-muted">여러 개 선택 가능 (선택)</span>
          </div>
          <div className="chip-grid">
            {roles.map((r) => (
              <button
                key={r.id}
                type="button"
                className={`survey-chip${answer.experience.includes(r.id) ? ' picked' : ''}`}
                onClick={() => toggleExperience(r.id)}
                aria-pressed={answer.experience.includes(r.id)}
              >
                <span aria-hidden="true">{r.emoji}</span>
                {r.name}
              </button>
            ))}
          </div>
        </section>

        <section className="flow-section">
          <div className="flow-section-head">
            <h2>4. 조장을 맡을 의향이 있나요?</h2>
          </div>
          <div className="chip-grid">
            {[
              { v: 'yes', label: '네, 맡을게요' },
              { v: 'any', label: '상관없어요' },
              { v: 'no', label: '아니요' },
            ].map((o) => (
              <button
                key={o.v}
                type="button"
                className={`survey-chip${answer.leader === o.v ? ' picked' : ''}`}
                onClick={() => setAnswer((a) => ({ ...a, leader: o.v }))}
                aria-pressed={answer.leader === o.v}
              >
                {o.label}
              </button>
            ))}
          </div>
        </section>

        <div className="flow-actions">
          {submitted ? (
            <span className="flow-muted">제출했습니다. 전원이 제출하면 역할이 배정됩니다.</span>
          ) : (
            <span className="flow-muted">
              선호 역할을 1개 이상 골라주세요. 응답하지 않으면 중립으로 처리됩니다.
            </span>
          )}

          <div className="regen-row">
            {!submitted && (
              <button type="button" className="btn btn-dark" onClick={() => setSubmitted(true)}>
                설문 제출
              </button>
            )}
            {/* 생성자에게만 보이는 버튼 — 4단계에서 생성자 여부로 조건부 렌더링 */}
            <button type="button" className="btn btn-ghost" onClick={handleClose}>
              설문 마감하고 배정하기
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
