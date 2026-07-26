import { render, screen } from "@testing-library/react"
import { describe, it, expect } from "vitest"
import AccuracyTrend from "./AccuracyTrend"

function makeDecision({ id, decision, marketSentiment, createdAt }) {
  return { id, decision, marketSentiment, createdAt }
}

describe("AccuracyTrend", () => {
  describe("정상 케이스", () => {
    it("적중률 텍스트와 판단 건수만큼의 스파크 블록을 렌더링한다", () => {
      const decisions = [
        makeDecision({ id: "1", decision: "buy", marketSentiment: "bullish", createdAt: "2026-07-20" }),
        makeDecision({ id: "2", decision: "sell", marketSentiment: "bearish", createdAt: "2026-07-19" }),
      ]
      const { container } = render(<AccuracyTrend decisions={decisions} />)
      expect(screen.getByText("최근 2건 중 적중 2건 (100%)")).toBeInTheDocument()
      expect(container.querySelectorAll(".spark-block")).toHaveLength(2)
    })
  })

  describe("경계값", () => {
    it("decisions가 빈 배열이면 아무것도 렌더링하지 않는다", () => {
      const { container } = render(<AccuracyTrend decisions={[]} />)
      expect(container).toBeEmptyDOMElement()
    })

    it("marketSentiment이 전부 없으면 판정 불가 문구를 보여준다", () => {
      const decisions = [
        makeDecision({ id: "1", decision: "buy", marketSentiment: null, createdAt: "2026-07-20" }),
      ]
      render(<AccuracyTrend decisions={decisions} />)
      expect(screen.getByText("최근 1건은 아직 판정 불가예요")).toBeInTheDocument()
    })
  })
})
