import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import logo from '../../assets/logo.png'
import { useApi, apiPost } from '../../api/client'
import './flow.css'

/* 팀원 설문 — 배정 점수의 입력값을 모은다. 응답은 비공개(팀원끼리 서로 못 봄).
   프로젝트의 실제 역할(GET /api/projects/:id/survey)로 설문을 받아 surveys에 저장한다.
   설문 마감→배정은 다음 슬라이스. */
export default function Survey() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { loading, error, data, reload } = useApi(`/api/projects/${id}/survey`)

  const [answer, setAnswer] = useState({
    preferences: [], // 순서가 곧 1·2·3순위
    avoid: null,
    experience: [],
    leader: 'any',
  })
  const [busy, setBusy] = useState(false)
  const [submitError, setSubmitError] = useState('')

  // 제출 후엔 다른 팀원의 합류·제출 현황이 갱신되도록 30초마다 새로고침
  const hasSubmitted = data?.mySubmitted
  useEffect(() => {
    if (!hasSubmitted) return
    const timer = setInterval(reload, 30000)
    return () => clearInterval(timer)
  }, [hasSubmitted, reload])

  if (loading) {
    return (
      <div className="flow-page">
        <div className="flow-card flow-center"><h2>설문을 불러오는 중…</h2></div>
      </div>
    )
  }
  if (error) {
    return (
      <div className="flow-page">
        <div className="flow-card flow-center">
          <h2>설문을 열 수 없습니다</h2>
          <p className="flow-muted">{error}</p>
          <button type="button" className="btn btn-ghost" onClick={reload}>다시 시도</button>
        </div>
      </div>
    )
  }

  const { project, roles, memberCount, submittedCount, mySubmitted, isCreator } = data

  // 이미 배정됐으면(팀원이 배정 후 들어온 경우 등) 설문 대신 결과로 안내
  if (['assigned', 'active', 'completed'].includes(project.status)) {
    return (
      <div className="flow-page">
        <div className="flow-card flow-center">
          <span className="invite-icon" aria-hidden="true">✓</span>
          <h1>역할 배정이 완료되었습니다</h1>
          <p className="flow-muted">팀의 역할 배정 결과를 확인하세요.</p>
          <Link to={`/projects/${id}/result`} className="btn btn-dark">배정 결과 보기</Link>
        </div>
      </div>
    )
  }

  function togglePreference(roleId) {
    setSubmitError('')
    setAnswer((a) => {
      if (a.preferences.includes(roleId)) {
        return { ...a, preferences: a.preferences.filter((rid) => rid !== roleId) }
      }
      if (a.preferences.length >= 3) return a // 3순위까지만
      return { ...a, preferences: [...a.preferences, roleId] }
    })
  }

  function toggleExperience(roleId) {
    setAnswer((a) => ({
      ...a,
      experience: a.experience.includes(roleId)
        ? a.experience.filter((rid) => rid !== roleId)
        : [...a.experience, roleId],
    }))
  }

  function setAvoid(roleId) {
    setAnswer((a) => ({
      ...a,
      avoid: a.avoid === roleId ? null : roleId,
      // 기피로 고른 역할은 선호에서 자동 제외 (모순 방지)
      preferences: a.preferences.filter((rid) => rid !== roleId),
    }))
  }

  const rankOf = (roleId) => answer.preferences.indexOf(roleId) + 1
  const canSubmit = answer.preferences.length > 0 && !busy

  async function handleSubmit() {
    if (answer.preferences.length === 0) {
      setSubmitError('맡고 싶은 역할을 1개 이상 골라주세요.')
      return
    }
    setSubmitError('')
    setBusy(true)
    try {
      await apiPost(`/api/projects/${id}/survey`, answer)
      reload() // 제출 현황·내 제출 여부 갱신
    } catch (err) {
      setSubmitError(err.message)
    } finally {
      setBusy(false)
    }
  }

  // 생성자 전용: 설문을 마감하고 역할 배정을 실행한다 (정원 미달이면 확인)
  async function handleAssign() {
    if (submittedCount < project.headcount) {
      const ok = window.confirm(
        `현재 정원 ${project.headcount}명 중 ${submittedCount}명이 설문에 참여했습니다. ` +
        `참여한 ${submittedCount}명으로 배정을 진행할까요?`,
      )
      if (!ok) return
    }
    setSubmitError('')
    setBusy(true)
    try {
      await apiPost(`/api/projects/${id}/assign`)
      navigate(`/projects/${id}/result`)
    } catch (err) {
      setSubmitError(err.message)
      setBusy(false)
    }
  }

  return (
    <div className="flow-page">
      <header className="flow-top">
        <img src={logo} alt="" />
        {mySubmitted ? (
          <button
            type="button"
            className="flow-top-link"
            onClick={() => document.getElementById('survey-wait')?.scrollIntoView({ behavior: 'smooth', block: 'center' })}
          >
            역할 설문
          </button>
        ) : (
          <span>역할 설문</span>
        )}
      </header>

      <div className="flow-card">
        <h1>{project.title}</h1>
        <p className="flow-muted">
          응답은 <strong>비공개</strong>입니다. 팀원끼리 서로의 답변을 볼 수 없고,
          배정 결과에는 팀 전체 통계만 표시됩니다.
        </p>

        {mySubmitted && (
          <div id="survey-wait" className="survey-wait">
            <p className="survey-wait-title">✓ 설문을 제출했어요</p>
            <div className="survey-wait-rows">
              <div className="wait-row"><span>합류 현황</span><strong>{memberCount} / {project.headcount}명</strong></div>
              <div className="wait-row"><span>제출 현황</span><strong>{submittedCount} / {memberCount}명</strong></div>
            </div>
            <p className="flow-muted">모든 팀원이 설문을 제출하면 역할 배정이 시작됩니다.</p>
            <button type="button" className="btn btn-ghost btn-sm" onClick={reload}>현황 새로고침</button>
          </div>
        )}

        <div className="survey-status">
          <div className="join-status-head">
            <strong>제출 현황</strong>
            <span>{submittedCount} / {memberCount}명</span>
          </div>
          <div className="slot-list">
            {Array.from({ length: memberCount }, (_, i) => (
              <span key={i} className={`slot${i < submittedCount ? ' filled' : ''}`}>
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

        {submitError && <p className="join-error">{submitError}</p>}

        <div className="flow-actions">
          <span className="flow-muted">
            {mySubmitted
              ? '제출 완료. 다시 제출하면 이전 응답을 덮어씁니다.'
              : '선호 역할을 1개 이상 골라 제출하세요. 응답하지 않으면 배정에서 중립으로 처리됩니다.'}
            {isCreator && ' 전원이 제출하면 "마감하고 배정"으로 역할을 배정하세요.'}
          </span>
          <div className="regen-row">
            <button type="button" className="btn btn-dark" onClick={handleSubmit} disabled={!canSubmit}>
              {busy ? '제출 중…' : mySubmitted ? '다시 제출' : '설문 제출'}
            </button>
            {isCreator && (
              <button type="button" className="btn btn-ghost" onClick={handleAssign} disabled={busy}>
                설문 마감하고 배정하기
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
