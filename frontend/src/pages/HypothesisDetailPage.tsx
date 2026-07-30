import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import '../App.css'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || ''

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
  display_index: number
  cause: string
  effect: string
  status: string
  verification_status: string
}

interface RefineChat {
  id: string
  role: 'user' | 'assistant'
  message: string | null
  diff_json: { old_text: string; new_text: string; new_citations: { marker: number; evidence_tag_id: string }[] } | null
  applied_at: string | null
}

interface DetailData {
  hypothesis: Hypothesis
  verification_result: VerificationResult | null
  evidence_tags: EvidenceTag[]
  refine_chats: RefineChat[]
}

const STATUS_BADGE_CLASS: Record<string, string> = {
  '검토 전': 'badge-pending',
  '유력함': 'badge-strong',
  '근거 부족': 'badge-weak',
  '수정 필요': 'badge-danger',
}

// '수정'은 판단 버튼에서 뺐다 — 실제 편집은 위쪽 "원인/결과 수정" 진입점에서만 일어난다.
const JUDGMENT_OPTIONS = ['유지', '폐기']

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
        onClick={() => {
          // 텍스트를 드래그하다 마커 위에서 손을 뗀 경우까지 참조 클릭으로 처리하면
          // 드로어가 의도치 않게 열려 다음 드래그를 막는다. 선택 중이면 무시한다.
          const selection = window.getSelection()
          if (selection && !selection.isCollapsed && selection.toString().trim()) return
          onCitationClick(citation.evidence_tag_id)
        }}
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

  const summaryRef = useRef<HTMLParagraphElement>(null)
  const [highlightedText, setHighlightedText] = useState('')
  const [refineMessage, setRefineMessage] = useState('')
  const [refineError, setRefineError] = useState<string | null>(null)
  const [isRefining, setIsRefining] = useState(false)
  const [applyingChatId, setApplyingChatId] = useState<string | null>(null)
  const [applyError, setApplyError] = useState<string | null>(null)

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

  // 검증결과 문단에서 텍스트를 드래그 선택하면 하이라이트로 캡처한다(플로팅 툴바 없는 단순 구현).
  function handleSummaryMouseUp() {
    const selection = window.getSelection()
    if (!selection || selection.isCollapsed || !summaryRef.current) return
    if (!summaryRef.current.contains(selection.anchorNode)) return
    const text = selection.toString().trim()
    if (text) setHighlightedText(text)
  }

  async function submitRefine() {
    if (!refineMessage.trim()) {
      setRefineError('의견을 입력해주세요.')
      return
    }
    setRefineError(null)
    setIsRefining(true)
    try {
      const res = await fetch(`${API_BASE_URL}/api/projects/${id}/hypotheses/${hid}/refine`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ highlighted_text: highlightedText, message: refineMessage }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error || '리파인 요청에 실패했습니다.')
      }
      const { user_chat, assistant_chat } = await res.json()
      setData((prev) => (prev ? { ...prev, refine_chats: [...prev.refine_chats, user_chat, assistant_chat] } : prev))
      setRefineMessage('')
      setHighlightedText('')
    } catch (err) {
      setRefineError(err instanceof Error ? err.message : '리파인 요청 중 오류가 발생했습니다.')
    } finally {
      setIsRefining(false)
    }
  }

  async function applyDraft(chatId: string) {
    setApplyError(null)
    setApplyingChatId(chatId)
    try {
      const res = await fetch(`${API_BASE_URL}/api/projects/${id}/hypotheses/${hid}/refine/${chatId}/apply`, {
        method: 'POST',
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error || '가안 적용에 실패했습니다.')
      }
      const { verification_result: updated } = await res.json()
      setData((prev) =>
        prev
          ? {
              ...prev,
              verification_result: updated,
              refine_chats: prev.refine_chats.map((c) =>
                c.id === chatId ? { ...c, applied_at: new Date().toISOString() } : c,
              ),
            }
          : prev,
      )
    } catch (err) {
      setApplyError(err instanceof Error ? err.message : '가안 적용 중 오류가 발생했습니다.')
    } finally {
      setApplyingChatId(null)
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

  const { hypothesis, verification_result: vr, evidence_tags: evidenceTags, refine_chats: refineChats } = data
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
          <div className="hypothesis-field-group">
            <span className="hypothesis-index">가설 {hypothesis.display_index + 1}</span>
            <div className="hypothesis-field">
              <span className="hypothesis-field-label">원인</span>
              <div className="hypothesis-field-value">{hypothesis.cause}</div>
            </div>
            <span className="hypothesis-arrow">↓</span>
            <div className="hypothesis-field">
              <span className="hypothesis-field-label">결과</span>
              <div className="hypothesis-field-value">{hypothesis.effect}</div>
            </div>
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
            <p className="detail-summary" ref={summaryRef} onMouseUp={handleSummaryMouseUp}>
              {renderSummaryWithCitations(vr.summary, vr.citations, setDrawerEvidenceId)}
            </p>

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

      {vr && (
        <section className="card">
          <label className="field-label">반박 / 의견</label>
          <p className="detail-empty">검증결과 문단에서 동의하지 않는 부분을 드래그해 선택한 뒤, 의견을 남겨보세요.</p>

          {highlightedText && (
            <div className="refine-highlight">
              <span className="hypothesis-field-label">선택한 부분</span>
              <p className="refine-highlight-text">“{highlightedText}”</p>
              <button type="button" className="btn-remove" onClick={() => setHighlightedText('')}>
                선택 지우기
              </button>
            </div>
          )}

          <div className="field">
            <textarea
              className="textarea"
              placeholder="예: 이 부분은 근거가 부족해 보여요. 다른 발언은 없었나요?"
              value={refineMessage}
              onChange={(e) => setRefineMessage(e.target.value)}
            />
          </div>
          {refineError && <p className="error-text">{refineError}</p>}
          <div className="detail-edit-actions">
            <button type="button" className="btn btn-primary" onClick={submitRefine} disabled={isRefining}>
              {isRefining ? 'AI에게 물어보는 중...' : 'AI에게 물어보기'}
            </button>
          </div>

          {refineChats.length > 0 && (
            <div className="refine-chat-list">
              {applyError && <p className="error-text">{applyError}</p>}
              {refineChats.map((chat) => (
                <div key={chat.id} className={`refine-chat-bubble refine-chat-${chat.role}`}>
                  <span className="refine-chat-role">{chat.role === 'user' ? '나' : 'AI'}</span>
                  <p>{chat.message}</p>
                  {chat.role === 'assistant' && chat.diff_json && (
                    <div className="refine-draft">
                      <span className="hypothesis-field-label">수정 가안</span>
                      <p className="refine-draft-text">{chat.diff_json.new_text}</p>
                      {chat.applied_at ? (
                        <span className="badge badge-strong">적용됨</span>
                      ) : (
                        <button
                          type="button"
                          className="btn btn-primary"
                          disabled={applyingChatId === chat.id}
                          onClick={() => applyDraft(chat.id)}
                        >
                          {applyingChatId === chat.id ? '적용 중...' : '적용'}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {drawerEvidence && (
        <>
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
