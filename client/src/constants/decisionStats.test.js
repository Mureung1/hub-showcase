import { describe, it, expect } from "vitest"
import { isHit, computeRecentAccuracy, groupDecisionsByMonth } from "./decisionStats.js"

function makeDecision({ id, decision, marketSentiment, createdAt }) {
  return { id, decision, marketSentiment, createdAt }
}

describe("isHit", () => {
  describe("정상 케이스", () => {
    it.each([
      ["bullish", "buy", true],
      ["bearish", "sell", true],
      ["neutral", "hold", true],
      ["bullish", "sell", false],
      ["bearish", "hold", false],
    ])("marketSentiment=%s, decision=%s이면 %s를 반환한다", (marketSentiment, decision, expected) => {
      expect(isHit(decision, marketSentiment)).toBe(expected)
    })
  })

  describe("경계값", () => {
    it("marketSentiment이 null이면 판정 불가로 null을 반환한다", () => {
      expect(isHit("buy", null)).toBeNull()
    })
  })
})

describe("computeRecentAccuracy", () => {
  describe("정상 케이스", () => {
    it("적중/불일치가 섞여 있으면 marketSentiment이 있는 항목만으로 비율을 계산한다", () => {
      const decisions = [
        makeDecision({ id: "1", decision: "buy", marketSentiment: "bullish", createdAt: "2026-07-20" }),
        makeDecision({ id: "2", decision: "hold", marketSentiment: "bearish", createdAt: "2026-07-19" }),
        makeDecision({ id: "3", decision: "sell", marketSentiment: "bearish", createdAt: "2026-07-18" }),
      ]
      const result = computeRecentAccuracy(decisions, 10)
      expect(result.total).toBe(3)
      expect(result.hitCount).toBe(2)
      expect(result.ratePercent).toBe(67)
    })

    it("marketSentiment이 없는 항목은 분모에서 제외하되 total/blocks에는 포함한다", () => {
      const decisions = [
        makeDecision({ id: "1", decision: "buy", marketSentiment: "bullish", createdAt: "2026-07-20" }),
        makeDecision({ id: "2", decision: "hold", marketSentiment: null, createdAt: "2026-07-19" }),
      ]
      const result = computeRecentAccuracy(decisions, 10)
      expect(result.total).toBe(2)
      expect(result.hitCount).toBe(1)
      expect(result.ratePercent).toBe(100)
      expect(result.blocks.map((b) => b.result)).toEqual(["none", "hit"])
    })

    it("blocks는 과거→최근 순으로(입력의 역순) 정렬된다", () => {
      const decisions = [
        makeDecision({ id: "recent", decision: "buy", marketSentiment: "bullish", createdAt: "2026-07-20" }),
        makeDecision({ id: "older", decision: "sell", marketSentiment: "bearish", createdAt: "2026-07-19" }),
      ]
      const result = computeRecentAccuracy(decisions, 10)
      expect(result.blocks.map((b) => b.id)).toEqual(["older", "recent"])
    })
  })

  describe("경계값", () => {
    it("빈 배열이면 total 0, ratePercent null, blocks 빈 배열을 반환한다", () => {
      const result = computeRecentAccuracy([], 10)
      expect(result).toEqual({ total: 0, hitCount: 0, ratePercent: null, blocks: [] })
    })

    it("전부 marketSentiment이 없으면 ratePercent는 null이다", () => {
      const decisions = [
        makeDecision({ id: "1", decision: "buy", marketSentiment: null, createdAt: "2026-07-20" }),
      ]
      const result = computeRecentAccuracy(decisions, 10)
      expect(result.ratePercent).toBeNull()
    })

    it("decisions 개수가 limit보다 적으면 있는 만큼만 사용한다", () => {
      const decisions = [
        makeDecision({ id: "1", decision: "buy", marketSentiment: "bullish", createdAt: "2026-07-20" }),
      ]
      const result = computeRecentAccuracy(decisions, 10)
      expect(result.total).toBe(1)
    })

    it("limit보다 개수가 많으면 앞에서부터(최신순) limit개만 사용한다", () => {
      const decisions = [
        makeDecision({ id: "1", decision: "buy", marketSentiment: "bullish", createdAt: "2026-07-20" }),
        makeDecision({ id: "2", decision: "buy", marketSentiment: "bullish", createdAt: "2026-07-19" }),
        makeDecision({ id: "3", decision: "buy", marketSentiment: "bearish", createdAt: "2026-07-18" }),
      ]
      const result = computeRecentAccuracy(decisions, 2)
      expect(result.total).toBe(2)
      expect(result.blocks.map((b) => b.id)).toEqual(["2", "1"])
    })
  })
})

describe("groupDecisionsByMonth", () => {
  describe("정상 케이스", () => {
    it("createdAt의 월별로 묶고 각 그룹의 적중률을 함께 계산한다", () => {
      const decisions = [
        makeDecision({ id: "1", decision: "buy", marketSentiment: "bullish", createdAt: "2026-07-20" }),
        makeDecision({ id: "2", decision: "sell", marketSentiment: "bullish", createdAt: "2026-07-19" }),
        makeDecision({ id: "3", decision: "buy", marketSentiment: "bullish", createdAt: "2026-06-15" }),
      ]
      const groups = groupDecisionsByMonth(decisions)
      expect(groups).toHaveLength(2)
      expect(groups[0]).toMatchObject({ monthLabel: "7월", ratePercent: 50 })
      expect(groups[0].items).toHaveLength(2)
      expect(groups[1]).toMatchObject({ monthLabel: "6월", ratePercent: 100 })
      expect(groups[1].items).toHaveLength(1)
    })
  })

  describe("경계값", () => {
    it("빈 배열이면 빈 배열을 반환한다", () => {
      expect(groupDecisionsByMonth([])).toEqual([])
    })

    it("한 그룹의 marketSentiment이 전부 없으면 그 그룹의 ratePercent는 null이다", () => {
      const decisions = [
        makeDecision({ id: "1", decision: "buy", marketSentiment: null, createdAt: "2026-07-20" }),
      ]
      const groups = groupDecisionsByMonth(decisions)
      expect(groups[0].ratePercent).toBeNull()
    })
  })
})
