import { useState } from "react"
import { Link } from "react-router-dom"
import Button from "../components/Button"
import Accordion from "../components/Accordion"

const LEVELS = ["basic", "mid", "high"]

// Placeholder data shaped like the /api/sentences response until the
// server-side newsCollector/llmService pipeline is wired up.
const SENTENCES = [
  {
    en: "Apple raised its guidance for iPhone production after strong demand for AI-powered features.",
    kr: "애플은 AI 기능에 대한 강한 수요에 힘입어 아이폰 생산 가이던스를 상향했다.",
    explanation: {
      basic: "guidance = 회사가 발표하는 실적 전망치.",
      mid: "guidance: 기업이 향후 실적에 대해 공식적으로 제시하는 전망치.",
      high: "guidance는 forecast보다 더 공식적이고 책임 있는 뉘앙스를 가집니다.",
    },
  },
]

/** Screen 5 — Key sentences + difficulty-adjustable expression explanations (feature B). */
export default function Sentences() {
  const [level, setLevel] = useState("basic")
  const [cardIndex, setCardIndex] = useState(0)
  const sentence = SENTENCES[cardIndex]
  const isLastCard = cardIndex === SENTENCES.length - 1

  return (
    <div>
      <h1>Today&apos;s Key Sentences</h1>

      <div role="tablist" aria-label="Explanation level">
        {LEVELS.map((lv) => (
          <button key={lv} role="tab" aria-selected={level === lv} onClick={() => setLevel(lv)}>
            {lv === "basic" ? "Beginner" : lv === "mid" ? "Intermediate" : "Advanced"}
          </button>
        ))}
      </div>

      <p>{sentence.en}</p>
      <p>{sentence.kr}</p>
      <Accordion title="Explanation">{sentence.explanation[level]}</Accordion>

      {isLastCard ? (
        <Link to="/terms">
          <Button>Next →</Button>
        </Link>
      ) : (
        <Button onClick={() => setCardIndex((i) => i + 1)}>Next Sentence →</Button>
      )}
    </div>
  )
}
