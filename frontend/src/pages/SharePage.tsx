import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import '../App.css'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'

interface EvidenceTag {
  id: string
  quote: string
  speaker: string | null
  badge_label: string | null
  interviewee_name: string | null
}

interface VerificationResult {
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
  verification_result: VerificationResult | null
  evidence_tags: EvidenceTag[]
}

interface Project {
  id: string
  title: string
  problem_definition: string
}

interface ReportData {
  project: Project
  hypotheses: Hypothesis[]
}

const STATUS_BADGE_CLASS: Record<string, string> = {
  '검토 전': 'badge-pending',
  '유력함': 'badge-strong',
  '근거 부족': 'badge-weak',
  '수정 필요': 'badge-danger',
}

// 공유 화면은 읽기 전용이라 드로어를 쓰지 않는다(position:fixed 오버레이는 인쇄에 안 나옴).
// [n] 마커는 클릭 링크가 아니라 그냥 텍스트로 두고, 아래 "근거 목록"에 번호를 맞춰 나열한다.
function SharePage() {
  const { token } = useParams<{ token: string }>()
  const [data, setData] = useState<ReportData | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!token) return
    fetch(`${API_BASE_URL}/api/share/${token}`)
      .then(async (res) => {
        if (!res.ok) {
          const body = await res.json().catch(() => ({}))
          throw new Error(body.error || '공유 링크를 불러오지 못했습니다.')
        }
        return res.json()
      })
      .then((body: ReportData) => setData(body))
      .catch((err) => setError(err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.'))
  }, [token])

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
    <div className="app-shell share-page">
      <header className="page-header no-print">
        <h1>{data.project.title}</h1>
        <p>{data.project.problem_definition}</p>
        <p className="detail-empty">읽기 전용 공유 화면입니다. 인쇄(Ctrl/Cmd+P)로 PDF 저장이 가능합니다.</p>
      </header>
      <header className="page-header print-only">
        <h1>{data.project.title}</h1>
        <p>{data.project.problem_definition}</p>
      </header>

      {data.hypotheses.map((h) => {
        const badgeClass = STATUS_BADGE_CLASS[h.verification_status] ?? 'badge-pending'
        const vr = h.verification_result

        return (
          <section className="card share-hypothesis-card" key={h.id}>
            <div className="detail-hypothesis-head">
              <span className={`badge ${badgeClass}`}>{h.verification_status}</span>
              <span className="hypothesis-field-label">내 판단: {h.status}</span>
            </div>

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

            {!vr ? (
              <p className="detail-empty">아직 분석 근거가 없습니다.</p>
            ) : (
              <>
                <p className="detail-summary">{vr.summary}</p>
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

            {h.evidence_tags.length > 0 && (
              <div className="detail-block">
                <span className="detail-block-label">근거 목록</span>
                <ol className="share-evidence-list">
                  {h.evidence_tags.map((tag) => (
                    <li key={tag.id}>
                      {tag.badge_label && <span className="badge badge-weak">{tag.badge_label}</span>}
                      <span className="drawer-quote">“{tag.quote}”</span>
                      <span className="drawer-meta">
                        {tag.speaker || '화자 미상'}
                        {tag.interviewee_name && ` · ${tag.interviewee_name} 인터뷰`}
                      </span>
                    </li>
                  ))}
                </ol>
              </div>
            )}
          </section>
        )
      })}
    </div>
  )
}

export default SharePage
