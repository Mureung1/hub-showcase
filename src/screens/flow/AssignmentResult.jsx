import { Link, useParams } from 'react-router'
import logo from '../../assets/logo.png'
import { useApi } from '../../api/client'
import './flow.css'

/* 배정 결과 — 서버(GET /api/projects/:id/result)가 결정적 점수 로직으로 배정한 결과를 보여준다.
   요약은 규칙 기반 통계(computeTeamStats)로 렌더하고, AI 설명자와 10분 맞교환은 다음 슬라이스. */
export default function AssignmentResult() {
  const { id } = useParams()
  const { loading, error, data, reload } = useApi(`/api/projects/${id}/result`)

  if (loading) {
    return (
      <div className="flow-page">
        <div className="flow-card flow-center"><h2>배정 결과를 불러오는 중…</h2></div>
      </div>
    )
  }
  if (error) {
    return (
      <div className="flow-page">
        <div className="flow-card flow-center">
          <h2>배정 결과를 열 수 없습니다</h2>
          <p className="flow-muted">{error}</p>
          <button type="button" className="btn btn-ghost" onClick={reload}>다시 시도</button>
        </div>
      </div>
    )
  }

  const { members, leaderRole, stats, summary } = data

  return (
    <div className="flow-page">
      <header className="flow-top">
        <img src={logo} alt="" />
        <span>역할 배정 결과</span>
      </header>

      <div className="flow-card">
        <h1>역할이 배정되었습니다</h1>
        <p className="flow-muted">
          설문 응답을 점수로 환산해 배정했습니다. 개인 응답은 공개되지 않고 팀 전체 통계만 표시됩니다.
        </p>

        <div className="explain-box">
          <strong>배정 요약</strong>
          {summary ? (
            <p>{summary}</p>
          ) : stats ? (
            <p>
              팀원 {stats.total}명 중 <strong>{stats.matchedPref}명</strong>이 선호한 역할을 받았고,{' '}
              <strong>{stats.expMatched}명</strong>은 경험이 있는 역할에 배정되었습니다.
              {stats.leaderVolunteer
                ? ' 조장은 직접 지원한 팀원이 맡았습니다.'
                : ' 조장 지원자가 없어 설문 점수가 가장 높은 팀원이 맡았습니다.'}
            </p>
          ) : (
            <p className="flow-muted">요약을 준비 중입니다.</p>
          )}
          {stats?.forcedCount > 0 && (
            <p className="explain-warn">
              ⚠ {stats.forcedNames.join('·')} 역할은 지원자가 부족해 기피 응답에도 배정되었습니다.
            </p>
          )}
          {(stats?.fullyAvoidedNames?.length ?? 0) > 0 && (
            <p className="explain-warn">
              ⚠ {stats.fullyAvoidedNames.join('·')} 역할은 팀 전원이 기피했습니다. 업무를 나눠 맡는 것을 권장합니다.
            </p>
          )}
        </div>

        <section className="flow-section">
          <div className="flow-section-head">
            <h2>팀원별 배정</h2>
            <span className="flow-muted">{members.length}명</span>
          </div>
          <div className="assign-grid">
            {members.map((m) => (
              <button key={m.nickname} type="button" className="assign-card" disabled>
                <span className="assign-avatar" aria-hidden="true">{m.nickname.slice(0, 1)}</span>
                <span className="assign-meta">
                  <strong>
                    {m.nickname}
                    {m.isCreator && <em className="assign-tag">생성자</em>}
                    {m.isLeader && leaderRole && (
                      <em className="assign-tag leader">{leaderRole.emoji} {leaderRole.name}</em>
                    )}
                  </strong>
                  <span className="assign-role">
                    {m.roles.length > 0
                      ? m.roles.map((r) => `${r.emoji} ${r.name}`).join(' + ')
                      : '미배정'}
                  </span>
                </span>
              </button>
            ))}
          </div>
        </section>

        <div className="flow-actions">
          <span className="flow-muted">역할이 확정되었습니다. (역할 맞교환은 다음 단계에서 제공됩니다.)</span>
          <Link to="/app/dashboard" className="btn btn-dark">프로젝트 시작하기</Link>
        </div>
      </div>
    </div>
  )
}
