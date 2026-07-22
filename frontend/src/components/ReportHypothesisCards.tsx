// 공유 화면(SharePage)과 PDF 인쇄 미리보기(PrintPreviewPage)가 공유하는 읽기 전용 렌더링.
// 두 화면이 같은 데이터 형태(getFullProjectReport 결과)를 각자 렌더하면 내용이 어긋날
// 위험이 있어 하나로 모았다.

export interface EvidenceTag {
  id: string
  quote: string
  speaker: string | null
  badge_label: string | null
  interviewee_name: string | null
}

export interface VerificationResult {
  summary: string
  direction: string
  key_evidence: string
  citations: { marker: number; evidence_tag_id: string }[]
  suggested_status: string
}

export interface ReportHypothesis {
  id: string
  display_index: number
  cause: string
  effect: string
  status: string
  verification_status: string
  verification_result: VerificationResult | null
  evidence_tags: EvidenceTag[]
}

const STATUS_BADGE_CLASS: Record<string, string> = {
  '검토 전': 'badge-pending',
  '유력함': 'badge-strong',
  '근거 부족': 'badge-weak',
  '수정 필요': 'badge-danger',
}

function ReportHypothesisCards({ hypotheses }: { hypotheses: ReportHypothesis[] }) {
  return (
    <>
      {hypotheses.map((h) => {
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
    </>
  )
}

export default ReportHypothesisCards
