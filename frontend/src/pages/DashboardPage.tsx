import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import '../App.css'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'

interface VerificationResult {
  id: string
  summary: string
  direction: string
  key_evidence: string
  citations: { marker: number; evidence_tag_id: string }[]
  suggested_status: string
}

interface Hypothesis {
  id: string
  cause: string
  effect: string
  status: string
  verification_status: string
  verification_result: VerificationResult | null
}

interface Project {
  id: string
  title: string
  problem_definition: string
}

interface DashboardData {
  project: Project
  hypotheses: Hypothesis[]
}

// 검증 상태 배지 — AI가 제안한 verification_status(Task 4). design.md에 정의된 색상 토큰만 조합.
const STATUS_BADGE_CLASS: Record<string, string> = {
  '검토 전': 'badge-pending',
  '유력함': 'badge-strong',
  '근거 부족': 'badge-weak',
  '수정 필요': 'badge-danger',
}

// 판단 필요성 — verification_status를 사용자가 취할 행동으로 번역한 권고 문구(확정이 아닌 제안).
const RECOMMENDATION_BY_STATUS: Record<string, string> = {
  '유력함': '유지 권장',
  '근거 부족': '판단 보류',
  '수정 필요': '수정 권장',
}

// 사용자가 확정하는 판단값. AI 제안(verification_status)과는 별개.
const JUDGMENT_OPTIONS = ['유지', '수정', '폐기']

function DashboardPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [data, setData] = useState<DashboardData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [judgmentError, setJudgmentError] = useState<string | null>(null)
  const [pendingJudgmentId, setPendingJudgmentId] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    fetch(`${API_BASE_URL}/api/projects/${id}`)
      .then(async (res) => {
        if (!res.ok) {
          const body = await res.json().catch(() => ({}))
          throw new Error(body.error || '프로젝트를 불러오지 못했습니다.')
        }
        return res.json()
      })
      .then((body: DashboardData) => setData(body))
      .catch((err) => setError(err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.'))
  }, [id])

  function toggleSelected(hypothesisId: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(hypothesisId)) next.delete(hypothesisId)
      else next.add(hypothesisId)
      return next
    })
  }

  // 판단 확정. 이미 같은 값이면 '검토 전'으로 되돌려 선택 해제로 동작한다.
  async function handleJudgment(hypothesisId: string, currentStatus: string, nextStatus: string) {
    const statusToSend = currentStatus === nextStatus ? '검토 전' : nextStatus
    setJudgmentError(null)
    setPendingJudgmentId(hypothesisId)
    try {
      const res = await fetch(`${API_BASE_URL}/api/projects/${id}/hypotheses/${hypothesisId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: statusToSend }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error || '판단 저장에 실패했습니다.')
      }
      // 서버가 확정한 값으로 해당 행만 교체한다(클라이언트가 보낸 값이 아니라 DB 결과 기준).
      const { hypothesis } = await res.json()
      setData((prev) =>
        prev
          ? {
              ...prev,
              hypotheses: prev.hypotheses.map((h) =>
                h.id === hypothesisId ? { ...h, status: hypothesis.status } : h,
              ),
            }
          : prev,
      )
    } catch (err) {
      setJudgmentError(err instanceof Error ? err.message : '판단 저장 중 오류가 발생했습니다.')
    } finally {
      setPendingJudgmentId(null)
    }
  }

  if (error) {
    return (
      <div className="app-shell">
        <p className="error-text">{error}</p>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="app-shell">
        <p className="field-label">불러오는 중...</p>
      </div>
    )
  }

  return (
    <div className="app-shell">
      <header className="page-header">
        <h1>{data.project.title}</h1>
        <p>{data.project.problem_definition}</p>
      </header>

      <section className="card">
        <label className="field-label">가설 검증 결과</label>
        {judgmentError && <p className="error-text">{judgmentError}</p>}
        <ul className="hypothesis-list">
          {data.hypotheses.map((h) => {
            const badgeClass = STATUS_BADGE_CLASS[h.verification_status] ?? 'badge-pending'
            const recommendation = RECOMMENDATION_BY_STATUS[h.verification_status] ?? '분석 대기'
            const isDecided = h.status !== '검토 전'

            return (
              <li key={h.id} className="dashboard-row">
                <div
                  className="dashboard-row-main"
                  onClick={() => navigate(`/projects/${id}/hypotheses/${h.id}`)}
                >
                  <input
                    type="checkbox"
                    className="dashboard-checkbox"
                    checked={selectedIds.has(h.id)}
                    onClick={(e) => e.stopPropagation()}
                    onChange={() => toggleSelected(h.id)}
                    aria-label={`${h.cause} 선택`}
                  />
                  <span className={`badge ${badgeClass}`}>{h.verification_status}</span>
                  <span className="dashboard-hypothesis-name">
                    {h.cause} → {h.effect}
                  </span>
                  <span className="dashboard-recommendation">
                    AI 권고: {recommendation}
                    {h.verification_result?.direction && (
                      <span className="dashboard-direction"> · {h.verification_result.direction}</span>
                    )}
                  </span>
                </div>

                <div className="dashboard-judgment" onClick={(e) => e.stopPropagation()}>
                  <span className="dashboard-judgment-label">
                    내 판단{isDecided ? `: ${h.status}` : ' (미정)'}
                  </span>
                  <span className="judgment-group">
                    {JUDGMENT_OPTIONS.map((option) => (
                      <button
                        key={option}
                        type="button"
                        className={`judgment-btn${h.status === option ? ' is-active' : ''}`}
                        disabled={pendingJudgmentId === h.id}
                        aria-pressed={h.status === option}
                        onClick={() => handleJudgment(h.id, h.status, option)}
                      >
                        {option}
                      </button>
                    ))}
                  </span>
                </div>
              </li>
            )
          })}
        </ul>
      </section>
    </div>
  )
}

export default DashboardPage
