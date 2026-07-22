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
  display_index: number
  cause: string
  effect: string
  status: string
  verification_status: string
  viewed_at: string | null
  verification_result: VerificationResult | null
}

interface Project {
  id: string
  title: string
  problem_definition: string
  save_status: string
  share_token: string
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

// 사용자가 확정하는 판단값. AI 제안(verification_status)과는 별개.
// '수정'은 목록에서 뺐다 — 실제 편집은 여기서 일어나지 않고 상세 화면의 원인/결과 수정
// 진입점에서만 가능하므로, 판단 버튼에 두면 눌러도 아무 일도 안 일어나는 것처럼 보인다.
const JUDGMENT_OPTIONS = ['유지', '폐기']

function DashboardPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [data, setData] = useState<DashboardData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [judgmentError, setJudgmentError] = useState<string | null>(null)
  const [pendingJudgmentId, setPendingJudgmentId] = useState<string | null>(null)
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [isSavingStatus, setIsSavingStatus] = useState(false)

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

  async function copyShareLink() {
    if (!data) return
    const url = `${window.location.origin}/share/${data.project.share_token}`
    try {
      await navigator.clipboard.writeText(url)
      setCopyFeedback('공유 링크가 복사되었습니다.')
    } catch {
      setCopyFeedback(url) // 클립보드 권한이 없으면 링크 텍스트라도 보여준다.
    }
  }

  async function toggleSaveStatus() {
    if (!data) return
    const nextStatus = data.project.save_status === 'saved' ? 'draft' : 'saved'
    setSaveError(null)
    setIsSavingStatus(true)
    try {
      const res = await fetch(`${API_BASE_URL}/api/projects/${id}/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ save_status: nextStatus }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error || '저장 상태 변경에 실패했습니다.')
      }
      const { project } = await res.json()
      setData((prev) => (prev ? { ...prev, project: { ...prev.project, save_status: project.save_status } } : prev))
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : '저장 상태 변경 중 오류가 발생했습니다.')
    } finally {
      setIsSavingStatus(false)
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
        <div className="share-actions">
          <button type="button" className="btn-add" onClick={copyShareLink}>
            공유 링크 복사
          </button>
          <a className="btn-add" href={`${API_BASE_URL}/api/projects/${id}/report.md`}>
            리포트 다운로드
          </a>
          <button type="button" className="btn-add" onClick={toggleSaveStatus} disabled={isSavingStatus}>
            {data.project.save_status === 'saved' ? '저장됨 (임시저장으로 전환)' : '임시저장 중 (저장하기)'}
          </button>
        </div>
        {copyFeedback && <p className="copy-feedback">{copyFeedback}</p>}
        {saveError && <p className="error-text">{saveError}</p>}
      </header>

      <section className="card">
        <label className="field-label">가설 검증 결과</label>
        {judgmentError && <p className="error-text">{judgmentError}</p>}

        <div className="dashboard-header-row" aria-hidden="true">
          <span className="dashboard-header-checkbox" />
          <span className="dashboard-header-cell">상태</span>
          <span className="dashboard-header-cell">가설명</span>
          <span className="dashboard-header-cell dashboard-header-recommendation">AI 권고</span>
        </div>

        <ul className="hypothesis-list">
          {data.hypotheses.map((h) => {
            const badgeClass = STATUS_BADGE_CLASS[h.verification_status] ?? 'badge-pending'

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
                  <div className="hypothesis-field-group">
                    <span className="hypothesis-index">가설 {h.display_index + 1}</span>
                    <div className="hypothesis-field">
                      <span className="hypothesis-field-label">원인</span>
                      <div className="hypothesis-field-value">{h.cause}</div>
                    </div>
                    <span className="hypothesis-arrow">↓</span>
                    <div className="hypothesis-field">
                      <span className="hypothesis-field-label">결과</span>
                      <div className="hypothesis-field-value">{h.effect}</div>
                    </div>
                  </div>
                  <span className="dashboard-recommendation">
                    {h.verification_result?.direction || '아직 분석 근거가 없습니다.'}
                  </span>
                </div>

                <div className="dashboard-judgment" onClick={(e) => e.stopPropagation()}>
                  {/* 상세 화면을 아직 방문하지 않았을 때만 표시. 방문(viewed_at 기록)하면 사라진다. */}
                  {!h.viewed_at && <span className="badge badge-pending dashboard-unviewed-tag">검토 전</span>}
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
