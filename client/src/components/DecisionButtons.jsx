import { useState } from "react"

const OPTIONS = [
  { value: "buy", label: "🐂 Bullish" },
  { value: "hold", label: "➖ Neutral" },
  { value: "sell", label: "🐻 Bearish" },
]

export default function DecisionButtons({ onDecide }) {
  const [decision, setDecision] = useState(null)
  const [revealed, setRevealed] = useState(false)

  function handleClick(value) {
    setDecision(value)
    onDecide(value)
  }

  function handleToggleReveal() {
    setRevealed((prev) => !prev)
  }

  function handleKeyDown(e) {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault()
      handleToggleReveal()
    }
  }

  return (
    <div className="decision-panel">
      <p
        className="decision-prompt"
        role="button"
        tabIndex={0}
        aria-pressed={revealed}
        onClick={handleToggleReveal}
        onKeyDown={handleKeyDown}
      >
        이 기사를 읽고, 오늘의 모의 투자 판단을 내려보세요
      </p>
      {revealed && (
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
      )}
    </div>
  )
}
