import { useState } from 'react'
import SentimentTag from '../SentimentTag.jsx'

const REPLY_LABEL = { polite: '정중함', friendly: '친근함', concise: '간결함' }

function ReviewResultCard({ item, onCopyError }) {
  const [copiedTone, setCopiedTone] = useState(null)

  function copyReply(text, toneKey) {
    navigator.clipboard
      .writeText(text)
      .then(() => {
        setCopiedTone(toneKey)
        setTimeout(() => {
          setCopiedTone((prev) => (prev === toneKey ? null : prev))
        }, 1500)
      })
      .catch(() => {
        onCopyError?.()
      })
  }

  return (
    <div className="review-card">
      <div className="review-text">&quot;{item.originalText}&quot;</div>
      <div className="meta-row">
        <SentimentTag sentiment={item.sentiment} />
        <span className="score-tag">관심도 {item.score}</span>
        {(item.keywords || []).map((keyword, kIdx) => (
          <span className="keyword-tag" key={kIdx}>
            #{keyword}
          </span>
        ))}
      </div>
      {item.improvementSuggestion && (
        <div className="solution-box">💡 개선 제안: {item.improvementSuggestion}</div>
      )}
      <div className="reply-list">
        {Object.entries(item.replyDrafts || {}).map(([toneKey, text]) => {
          const copied = copiedTone === toneKey
          return (
            <div className="reply-option" key={toneKey}>
              <div className="reply-header">
                <span className="reply-label">{REPLY_LABEL[toneKey] || toneKey}</span>
                <button
                  className={`copy-btn ${copied ? 'copied' : ''}`}
                  onClick={() => copyReply(text, toneKey)}
                >
                  {copied ? '복사됨 ✓' : '복사하기'}
                </button>
              </div>
              <div className="reply-text">{text}</div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default ReviewResultCard
