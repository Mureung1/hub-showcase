import { useState } from "react"
import Badge from "./Badge.jsx"
import { SENTIMENT_META } from "../constants/sentiment.js"
import { updateDecisionMemo } from "../api/decisions.js"

export default function HistoryCard({ item, onMemoSaved }) {
  const sentiment = SENTIMENT_META[item.marketSentiment]
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(item.memo ?? "")
  const [saving, setSaving] = useState(false)

  function startEdit() {
    setDraft(item.memo ?? "")
    setEditing(true)
  }

  function handleSave() {
    const trimmed = draft.trim()
    setSaving(true)
    updateDecisionMemo(item.id, trimmed === "" ? null : trimmed)
      .then((updated) => {
        onMemoSaved(item.id, updated.memo)
        setEditing(false)
      })
      .catch(() => {})
      .finally(() => setSaving(false))
  }

  return (
    <div className="history-item">
      <p className="history-date">{new Date(item.createdAt).toLocaleDateString("ko-KR")}</p>
      <div className="history-card">
        <h2 className="history-title">{item.title}</h2>

        <div className="history-compare">
          <div className="history-compare-item">
            <p className="history-compare-label">나의 선택</p>
            <Badge decision={item.decision} />
          </div>
          <div className="history-compare-item">
            <p className="history-compare-label">시장의 해석</p>
            {sentiment && <span className={`badge ${sentiment.tone}`}>{sentiment.label}</span>}
          </div>
        </div>

        <div className="history-memo">
          {editing ? (
            <>
              <textarea
                className="history-memo-input"
                value={draft}
                maxLength={200}
                onChange={(e) => setDraft(e.target.value)}
                autoFocus
              />
              <div className="history-memo-actions">
                <button type="button" onClick={handleSave} disabled={saving}>
                  저장
                </button>
                <button type="button" onClick={() => setEditing(false)} disabled={saving}>
                  취소
                </button>
              </div>
            </>
          ) : (
            <button type="button" className="history-memo-display" onClick={startEdit}>
              {item.memo ? item.memo : "판단 근거를 한 줄로 남겨보세요 (탭하여 작성)"}
            </button>
          )}
        </div>

        <details className="history-detail">
          <summary>🔽 AI 관점 해설 보기</summary>
          <ul className="history-summary">
            {item.summaryBullets.map((bullet) => (
              <li key={bullet}>{bullet}</li>
            ))}
          </ul>
          <p className="history-insight">{item.insight}</p>
          <a className="history-source-link" href={item.url} target="_blank" rel="noreferrer">
            원문 기사 보러가기 ↗
          </a>
        </details>
      </div>
    </div>
  )
}
