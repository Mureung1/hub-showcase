import { useState } from "react"
import { Link } from "react-router-dom"

const OPTIONS = [
  { value: "buy", label: "📈 매수" },
  { value: "hold", label: "➖ 관망" },
  { value: "sell", label: "📉 매도" },
]

export default function DecisionButtons({ onDecide }) {
  const [decision, setDecision] = useState(null)

  function handleClick(value) {
    setDecision(value)
    onDecide(value)
  }

  return (
    <div className="decision-panel">
      <p className="decision-prompt">이 기사를 읽고, 오늘의 모의 투자 판단을 내려보세요</p>
      <div className="decision-buttons">
        {OPTIONS.map(({ value, label }) => (
          <button
            key={value}
            type="button"
            className={decision === value ? `selected ${value}` : ""}
            onClick={() => handleClick(value)}
          >
            {label}
          </button>
        ))}
      </div>
      {decision && (
        <div className="decision-toast">
          <span>오늘의 모의 투자 판단 완료!</span>
          <Link to="/mypage">마이페이지에서 확인하기 →</Link>
        </div>
      )}
    </div>
  )
}
