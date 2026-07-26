import { useState } from "react"
import Badge from "./Badge.jsx"
import { SENTIMENT_META } from "../constants/sentiment.js"

export default function BottomSheet({ decision, marketSentiment, insight, onClose }) {
  const sentiment = SENTIMENT_META[marketSentiment]
  const [memoRevealed, setMemoRevealed] = useState(false)
  const [memo, setMemo] = useState("")

  // 오버레이 클릭/닫기 버튼 모두 동일하게 trim된 메모(빈 문자열이면 null)를
  // 넘기며 닫는다 — 바텀시트가 닫히는 모든 경로에서 저장 동작이 같아야 한다.
  function handleClose() {
    const trimmed = memo.trim()
    onClose(trimmed === "" ? null : trimmed)
  }

  return (
    <div className="bottom-sheet-overlay" onClick={handleClose}>
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

        <div className="bottom-sheet-memo">
          {!memoRevealed ? (
            <button
              type="button"
              className="bottom-sheet-memo-trigger"
              onClick={() => setMemoRevealed(true)}
            >
              내 생각 남기기
            </button>
          ) : (
            <textarea
              className="bottom-sheet-memo-input"
              placeholder="이 판단을 내린 이유를 한 줄로 남겨보세요"
              value={memo}
              maxLength={200}
              onChange={(e) => setMemo(e.target.value)}
              autoFocus
            />
          )}
        </div>

        <button type="button" className="bottom-sheet-close" onClick={handleClose}>
          닫기
        </button>
      </div>
    </div>
  )
}
