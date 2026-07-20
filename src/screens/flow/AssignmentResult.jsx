import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router'
import logo from '../../assets/logo.png'
import { getRolesForType } from '../../data/templates'
import { assignRoles, computeTeamStats } from '../../logic/assignRoles'
import { fallbackProject, makeMembers, makeMockSurveys } from './flowMock'
import './flow.css'

/* 배정 결과 — 점수 로직(assignRoles.js)의 결과를 보여준다.
   설명문은 4단계에서 Claude 배정 설명 에이전트가 생성하고, 여기 문구는 폴백으로 남는다. */

const SWAP_WINDOW_SEC = 600 // 공개 후 10분

export default function AssignmentResult() {
  const navigate = useNavigate()
  const { state } = useLocation()

  const project = useMemo(() => ({ ...fallbackProject(), ...(state ?? {}) }), [state])
  const roles = useMemo(() => getRolesForType(project.typeHint), [project.typeHint])
  const members = useMemo(() => makeMembers(project.headcount), [project.headcount])

  // 설문 응답: 나(1번)는 실제 제출값, 나머지는 목업. 4단계에서 전부 DB 조회로 교체
  const surveys = useMemo(() => {
    const mock = makeMockSurveys(members, roles)
    if (project.mySurvey && members[1]) mock[members[1].id] = project.mySurvey
    return mock
  }, [members, roles, project.mySurvey])

  // 배정은 결정적이므로 같은 입력이면 항상 같은 결과가 나온다
  const result = useMemo(() => assignRoles(members, surveys, roles), [members, surveys, roles])
  const stats = useMemo(
    () => computeTeamStats(members, surveys, roles, result),
    [members, surveys, roles, result],
  )

  const [published, setPublished] = useState(false)
  const [swaps, setSwaps] = useState({}) // memberId → roleId (맞교환 후 덮어쓴 역할)
  const [swapUsed, setSwapUsed] = useState(false)
  const [picked, setPicked] = useState([])
  const [remainSec, setRemainSec] = useState(SWAP_WINDOW_SEC)

  useEffect(() => {
    if (!published || swapUsed || remainSec <= 0) return
    const timer = setInterval(() => setRemainSec((s) => Math.max(s - 1, 0)), 1000)
    return () => clearInterval(timer)
  }, [published, swapUsed, remainSec])

  const roleOf = (memberId) => swaps[memberId] ?? result.byMember[memberId]?.[0]
  const roleInfo = (roleId) => roles.find((r) => r.id === roleId)
  const swapOpen = published && !swapUsed && remainSec > 0

  function togglePick(memberId) {
    if (!swapOpen) return
    setPicked((p) =>
      p.includes(memberId) ? p.filter((id) => id !== memberId) : [...p, memberId].slice(-2),
    )
  }

  function handleSwap() {
    if (picked.length !== 2) return
    const [a, b] = picked
    const [roleA, roleB] = [roleOf(a), roleOf(b)]
    setSwaps({ [a]: roleB, [b]: roleA })
    setSwapUsed(true)
    setPicked([])
  }

  const mmss = `${String(Math.floor(remainSec / 60)).padStart(2, '0')}:${String(remainSec % 60).padStart(2, '0')}`

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
          <p>
            팀원 {stats.total}명 중 <strong>{stats.matchedPref}명</strong>이 선호한 역할을 받았고,{' '}
            <strong>{stats.expMatched}명</strong>은 경험이 있는 역할에 배정되었습니다.
            {stats.leaderVolunteer
              ? ' 조장은 직접 지원한 팀원이 맡았습니다.'
              : ' 조장 지원자가 없어 설문 점수가 가장 높은 팀원이 맡았습니다.'}
          </p>
          {stats.forcedCount > 0 && (
            <p className="explain-warn">
              ⚠ {stats.forcedNames.join('·')} 역할은 지원자가 부족해 기피 응답에도 배정되었습니다.
              부담이 크면 아래 맞교환 기능을 활용해 주세요.
            </p>
          )}
          {stats.fullyAvoidedNames.length > 0 && (
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
              const role = roleInfo(roleOf(m.id))
              const isPicked = picked.includes(m.id)
              const isSwapped = swaps[m.id] !== undefined
              return (
                <button
                  key={m.id}
                  type="button"
                  className={`assign-card${isPicked ? ' picked' : ''}`}
                  onClick={() => togglePick(m.id)}
                  disabled={!swapOpen}
                  aria-pressed={isPicked}
                >
                  <span className="assign-avatar" aria-hidden="true">{m.name.slice(0, 1)}</span>
                  <span className="assign-meta">
                    <strong>
                      {m.name}
                      {m.isCreator && <em className="assign-tag">생성자</em>}
                    </strong>
                    <span className="assign-role">
                      {role ? `${role.emoji} ${role.name}` : '미배정'}
                      {isSwapped && <em className="assign-tag swapped">교환됨</em>}
                    </span>
                  </span>
                </button>
              )
            })}
          </div>
        </section>

        {published && (
          <div className="flow-notice">
            {swapUsed
              ? '역할 맞교환을 사용했습니다. 이후에는 변경할 수 없습니다.'
              : remainSec > 0
                ? `공개 후 10분 내에 한 번만 두 팀원의 역할을 맞교환할 수 있습니다. 남은 시간 ${mmss}`
                : '맞교환 가능 시간(10분)이 지났습니다. 역할이 확정되었습니다.'}
          </div>
        )}

        <div className="flow-actions">
          {!published ? (
            <>
              <span className="flow-muted">
                확인 후 공개하면 팀원 전체가 결과를 볼 수 있습니다.
              </span>
              {/* 생성자에게만 보이는 버튼 — 4단계에서 생성자 여부로 조건부 렌더링 */}
              <button type="button" className="btn btn-dark" onClick={() => setPublished(true)}>
                프로젝트 생성 완료
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={handleSwap}
                disabled={!swapOpen || picked.length !== 2}
              >
                선택한 2명 역할 맞교환
              </button>
              <button
                type="button"
                className="btn btn-dark"
                onClick={() => navigate('/app/dashboard')}
              >
                프로젝트 시작하기
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
