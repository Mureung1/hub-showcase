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

interface EvidenceTag {
  id: string
  quote: string
  speaker: string | null
  badge_label: string | null
  interviews: { interviewee_name: string | null } | null
}

interface Hypothesis {
  id: string
  cause: string
  effect: string
  status: string
  verification_status: string
}

interface DetailData {
  hypothesis: Hypothesis
  verification_result: VerificationResult | null
  evidence_tags: EvidenceTag[]
}

const STATUS_BADGE_CLASS: Record<string, string> = {
  '검토 전': 'badge-pending',
  '유력함': 'badge-strong',
  '근거 부족': 'badge-weak',
  '수정 필요': 'badge-danger',
}

const JUDGMENT_OPTIONS = ['유지', '수정', '폐기']

// summary 본문의 [n] 마커를 파싱해 citations와 매칭되는 것만 클릭 가능한 참조로 렌더한다.
// citations에 대응이 없는 마커는 일반 텍스트로 둔다(환각 방어 — Week3 계획서 리스크 조언과 동일 원칙).
function renderSummaryWithCitations(
  summary: string,
  citations: { marker: number; evidence_tag_id: string }[],
  onCitationClick: (evidenceTagId: string) => void,
) {
  const parts = summary.split(/(\[\d+\])/g)
  return parts.map((part, index) => {
    const match = part.match(/^\[(\d+)\]$/)
    if (!match) return <span key={index}>{part}</span>

    const marker = Number(match[1])
    const citation = citations.find((c) => c.marker === marker)
    if (!citation) return <span key={index}>{part}</span>

    return (
      <button
        key={index}
        type="button"
        className="citation-link"
        onClick={() => onCitationClick(citation.evidence_tag_id)}
      >
        {part}
      </button>
    )
  })
}

function HypothesisDetailPage() {
  const { id, hid } = useParams<{ id: string; hid: string }>()
  const navigate = useNavigate()

  const [data, setData] = useState<DetailData | null>(null)
  const [error, setError] = useState<string | null>(null)

  const [drawerEvidenceId, setDrawerEvidenceId] = useState<string | null>(null)

  const [judgmentError, setJudgmentError] = useState<string | null>(null)
  const [pendingJudgment, setPendingJudgment] = useState(false)

  const [isEditing, setIsEditing] = useState(false)
  const [editCause, setEditCause] = useState('')
  const [editEffect, setEditEffect] = useState('')
  const [editError, setEditError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  function loadDetail() {
    if (!id || !hid) return
    fetch(`${API_BASE_URL}/api/projects/${id}/hypotheses/${hid}`)
      .then(async (res) => {
        if (!res.ok) {
          const body = await res.json().catch(() => ({}))
          throw new Error(body.error || '가설을 불러오지 못했습니다.')
        }
        return res.json()
      })
      .then((body: DetailData) => setData(body))
      .catch((err) => setError(err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.'))
  }

  // 조회 자체가 대시보드의 "검토 전" 방문 표시(viewed_at)를 채우는 side effect를 겸한다(BE에서 처리).
  useEffect(() => {
    loadDetail()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, hid])

  async function handleJudgment(currentStatus: string, nextStatus: string) {
    if (!data) return
    const statusToSend = currentStatus === nextStatus ? '검토 전' : nextStatus
    setJudgmentError(null)
    setPendingJudgment(true)
    try {
      const res = await fetch(`${API_BASE_URL}/api/projects/${id}/hypotheses/${hid}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: statusToSend }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error || '판단 저장에 실패했습니다.')
      }
      const { hypothesis } = await res.json()
      setData((prev) => (prev ? { ...prev, hypothesis: { ...prev.hypothesis, status: hypothesis.status } } : prev))
    } catch (err) {
      setJudgmentError(err instanceof Error ? err.message : '판단 저장 중 오류가 발생했습니다.')
    } finally {
      setPendingJudgment(false)
    }
  }

  function startEditing() {
    if (!data) return
    setEditCause(data.hypothesis.cause)
    setEditEffect(data.hypothesis.effect)
    setEditError(null)
    setIsEditing(true)
  }

  async function saveEdit() {
    if (!editCause.trim() || !editEffect.trim()) {
      setEditError('원인과 결과를 모두 입력해주세요.')
      return
    }
    setEditError(null)
    setIsSaving(true)
    try {
      const res = await fetch(`${API_BASE_URL}/api/projects/${id}/hypotheses/${hid}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cause: editCause, effect: editEffect }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error || '수정 저장에 실패했습니다.')
      }
      const { hypothesis } = await res.json()
      setData((prev) =>
        prev
          ? { ...prev, hypothesis: { ...prev.hypothesis, cause: hypothesis.cause, effect: hypothesis.effect } }
          : prev,
      )
      setIsEditing(false)
    } catch (err) {
      setEditError(err instanceof Error ? err.message : '수정 저장 중 오류가 발생했습니다.')
    } finally {
      setIsSaving(false)
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

  const { hypothesis, verification_result: vr, evidence_tags: evidenceTags } = data
  const badgeClass = STATUS_BADGE_CLASS[hypothesis.verification_status] ?? 'badge-pending'
  const drawerEvidence = evidenceTags.find((t) => t.id === drawerEvidenceId) ?? null

  return (
    <div className="app-shell">
      <header className="page-header">
        <button type="button" className="back-link" onClick={() => navigate(`/projects/${id}`)}>
          ← 대시보드로
        </button>
        <h1>가설 상세</h1>
      </header>

      <section className="card">
        <div className="detail-hypothesis-head">
          <span className={`badge ${badgeClass}`}>{hypothesis.verification_status}</span>
          {!isEditing && (
            <button type="button" className="btn-add" onClick={startEditing}>
              원인/결과 수정
            </button>
          )}
        </div>

        {!isEditing ? (
          <div className="dashboard-hypothesis-name">
            <span className="dashboard-cause">원인: {hypothesis.cause}</span>
            <span className="dashboard-effect">→ 결과: {hypothesis.effect}</span>
          </div>
        ) : (
          <div className="detail-edit-form">
            <div className="field">
              <label className="field-label">원인</label>
              <input className="input" value={editCause} onChange={(e) => setEditCause(e.target.value)} />
            </div>
            <div className="field">
              <label className="field-label">결과</label>
              <input className="input" value={editEffect} onChange={(e) => setEditEffect(e.target.value)} />
            </div>
            {editError && <p className="error-text">{editError}</p>}
            <div className="detail-edit-actions">
              <button type="button" className="btn-remove" onClick={() => setIsEditing(false)} disabled={isSaving}>
                취소
              </button>
              <button type="button" className="btn btn-primary" onClick={saveEdit} disabled={isSaving}>
                {isSaving ? '저장 중...' : '저장'}
              </button>
            </div>
          </div>
        )}

        <div className="dashboard-judgment detail-judgment">
          {judgmentError && <p className="error-text">{judgmentError}</p>}
          <span className="judgment-group">
            {JUDGMENT_OPTIONS.map((option) => (
              <button
                key={option}
                type="button"
                className={`judgment-btn${hypothesis.status === option ? ' is-active' : ''}`}
                disabled={pendingJudgment}
                aria-pressed={hypothesis.status === option}
                onClick={() => handleJudgment(hypothesis.status, option)}
              >
                {option}
              </button>
            ))}
          </span>
        </div>
      </section>

      <section className="card">
        <label className="field-label">검증결과</label>
        {!vr ? (
          <p className="field-label detail-empty">아직 분석 근거가 없습니다.</p>
        ) : (
          <>
            <p className="detail-summary">{renderSummaryWithCitations(vr.summary, vr.citations, setDrawerEvidenceId)}</p>

            <div className="detail-block">
              <span className="detail-block-label">수정 방향성</span>
              <p>{vr.direction || '-'}</p>
            </div>
            <div className="detail-block">
              <span className="detail-block-label">핵심 근거</span>
              <p>{vr.key_evidence || '-'}</p>
            </div>
          </>
        )}
      </section>

      {drawerEvidence && (
        <>
          <div className="drawer-backdrop" onClick={() => setDrawerEvidenceId(null)} />
          <aside className="side-drawer">
            <div className="side-drawer-header">
              <span className="field-label">근거 발췌</span>
              <button type="button" className="btn-remove" onClick={() => setDrawerEvidenceId(null)}>
                닫기
              </button>
            </div>
            {drawerEvidence.badge_label && <span className="badge badge-weak">{drawerEvidence.badge_label}</span>}
            <p className="drawer-quote">“{drawerEvidence.quote}”</p>
            <p className="drawer-meta">
              {drawerEvidence.speaker || '화자 미상'}
              {drawerEvidence.interviews?.interviewee_name && ` · ${drawerEvidence.interviews.interviewee_name} 인터뷰`}
            </p>
          </aside>
        </>
      )}
    </div>
  )
}

export default HypothesisDetailPage
