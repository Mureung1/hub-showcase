import { describe, it, expect } from "vitest"
import { toDifficultyTier } from "./difficulty.js"

describe("toDifficultyTier", () => {
  describe("정상 케이스", () => {
    it.each([
      [5, "easy"],
      [4, "medium"],
      [3, "hard"],
    ])("readabilityScore가 %i이면 %s를 반환한다", (score, expected) => {
      expect(toDifficultyTier(score)).toBe(expected)
    })
  })

  describe("경계값", () => {
    it("readabilityScore가 5를 초과해도 easy를 반환한다", () => {
      expect(toDifficultyTier(6)).toBe("easy")
    })

    it("readabilityScore가 3 미만이어도 hard를 반환한다", () => {
      expect(toDifficultyTier(1)).toBe("hard")
    })
  })
})
