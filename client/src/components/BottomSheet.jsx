import Badge from "./Badge.jsx"
import { SENTIMENT_META } from "../constants/sentiment.js"

export default function BottomSheet({ decision, marketSentiment, insight, onClose }) {
  const sentiment = SENTIMENT_META[marketSentiment]

  return (
    <div className="bottom-sheet-overlay" onClick={onClose}>
      <div
        className="bottom-sheet"
        role="dialog"
        aria-modal="true"
        aria-label="나의 판단과 AI 인사이트 비교"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bottom-sheet-compare">
          <div className="bottom-sheet-compare-item">
            <p className="bottom-sheet-compare-label">나의 선택</p>
            <Badge decision={decision} />
          </div>
          <span className="bottom-sheet-compare-vs">vs</span>
          <div className="bottom-sheet-compare-item">
            <p className="bottom-sheet-compare-label">시장의 해석</p>
            {sentiment && <span className={`badge ${sentiment.tone}`}>{sentiment.label}</span>}
          </div>
        </div>

        <div className="bottom-sheet-insight">
          <p className="bottom-sheet-insight-label">AI 관점 해설</p>
          <p>{insight}</p>
        </div>

        <button type="button" className="bottom-sheet-close" onClick={onClose}>
          닫기
        </button>
      </div>
    </div>
  )
}
