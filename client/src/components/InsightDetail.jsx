import { useState } from "react"
import Badge from "./Badge.jsx"
import { SENTIMENT_META } from "../constants/sentiment.js"
import { updateDecisionMemo } from "../api/decisions.js"

export default function InsightDetail({ item, onMemoSaved }) {
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
    <article className="insight-detail-content">
      <header className="insight-detail-header">
        <h1>{item.title}</h1>
        <a
          className="insight-detail-link"
          href={item.url}
          target="_blank"
          rel="noreferrer"
          aria-label="원문 기사 보기"
        >
          ↗
        </a>
      </header>

      <div className="insight-context">
        <p className="insight-context-label">AI 3줄 요약</p>
        <ul className="insight-summary-list">
          {item.summaryBullets.map((bullet) => (
            <li key={bullet}>{bullet}</li>
          ))}
        </ul>
        <p className="insight-context-label">AI 인사이트</p>
        <p className="insight-highlight">{item.insight}</p>
      </div>

      <div className="insight-analysis">
        <div className="insight-analysis-col">
          <p className="insight-analysis-label">시장의 해석</p>
          {sentiment && <span className={`badge ${sentiment.tone}`}>{sentiment.label}</span>}
        </div>
        <div className="insight-analysis-col">
          <p className="insight-analysis-label">나의 판단</p>
          <Badge decision={item.decision} />
        </div>
      </div>

      <div className="insight-memo">
        {editing ? (
          <>
            <textarea
              className="insight-memo-input"
              value={draft}
              maxLength={200}
              onChange={(e) => setDraft(e.target.value)}
              autoFocus
            />
            <div className="insight-memo-actions">
              <button type="button" onClick={handleSave} disabled={saving}>
                저장
              </button>
              <button type="button" onClick={() => setEditing(false)} disabled={saving}>
                취소
              </button>
            </div>
          </>
        ) : (
          <button type="button" className="insight-memo-display" onClick={startEdit}>
            {item.memo ? item.memo : "판단 근거를 한 줄로 남겨보세요 (탭하여 작성)"}
          </button>
        )}
      </div>
    </article>
  )
}
