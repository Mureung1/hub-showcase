import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'
import logo from '../../assets/logo.png'
import { useApi, apiPost } from '../../api/client'
import './flow.css'

/* 배정 결과 — 서버(GET /api/projects/:id/result)의 배정을 보여준다.
   공개 후 10분 내 생성자가 두 팀원의 실무 역할을 1회 맞교환할 수 있다(POST /swap). */

const SWAP_WINDOW_SEC = 600 // 공개 후 10분

export default function AssignmentResult() {
  const { id } = useParams()
  const { loading, error, data, reload } = useApi(`/api/projects/${id}/result`)

  const [picked, setPicked] = useState([]) // 맞교환 대상 member id 2개
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState('')
  const [now, setNow] = useState(Date.now())

  // 카운트다운 갱신
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [])

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

  const { members, leaderRole, stats, summary, isCreator, swapUsed, project } = data
  const revealedMs = project.revealedAt ? new Date(project.revealedAt).getTime() : 0
  const remainSec = revealedMs ? Math.max(Math.floor((revealedMs + SWAP_WINDOW_SEC * 1000 - now) / 1000), 0) : 0
  const swapOpen = isCreator && !swapUsed && remainSec > 0
  const mmss = `${String(Math.floor(remainSec / 60)).padStart(2, '0')}:${String(remainSec % 60).padStart(2, '0')}`

  function togglePick(memberId) {
    if (!swapOpen) return
    setNotice('')
    setPicked((p) => (p.includes(memberId) ? p.filter((x) => x !== memberId) : [...p, memberId].slice(-2)))
  }

  async function handleSwap() {
    if (picked.length !== 2) return
    setNotice('')
    setBusy(true)
    try {
      await apiPost(`/api/projects/${id}/swap`, { memberA: picked[0], memberB: picked[1] })
      setPicked([])
      reload() // 바뀐 역할·swapUsed 반영
    } catch (err) {
      setNotice(err.message)
    } finally {
      setBusy(false)
    }
  }

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
            {swapOpen && <span className="flow-muted">교환할 팀원 2명을 선택하세요</span>}
          </div>
          <div className="assign-grid">
            {members.map((m) => {
              const isPicked = picked.includes(m.id)
              return (
                <button
                  key={m.id}
                  type="button"
                  className={`assign-card${isPicked ? ' picked' : ''}`}
                  onClick={() => togglePick(m.id)}
                  disabled={!swapOpen}
                  aria-pressed={isPicked}
                >
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
              )
            })}
          </div>
        </section>

        {isCreator && (
          <div className="flow-notice">
            {swapUsed
              ? '역할 맞교환을 사용했습니다. 이후에는 변경할 수 없습니다.'
              : remainSec > 0
                ? `공개 후 10분 내에 한 번만 두 팀원의 역할을 맞교환할 수 있습니다. 남은 시간 ${mmss}`
                : '맞교환 가능 시간(10분)이 지났습니다. 역할이 확정되었습니다.'}
          </div>
        )}
        {notice && <p className="join-error">{notice}</p>}

        <div className="flow-actions">
          {swapOpen ? (
            <button
              type="button"
              className="btn btn-ghost"
              onClick={handleSwap}
              disabled={picked.length !== 2 || busy}
            >
              {busy ? '교환 중…' : '선택한 2명 역할 맞교환'}
            </button>
          ) : (
            <span className="flow-muted">역할이 확정되었습니다.</span>
          )}
          <Link to="/app/dashboard" className="btn btn-dark">프로젝트 시작하기</Link>
        </div>
      </div>
    </div>
  )
}
