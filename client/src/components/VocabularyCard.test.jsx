import { render, screen, fireEvent } from "@testing-library/react"
import { describe, it, expect } from "vitest"
import VocabularyCard from "./VocabularyCard"

const item = {
  term: "bear market",
  definition: "주가가 장기간에 걸쳐 계속 하락하는 약세장을 뜻합니다.",
  excerpt: "Shares fell sharply as investors grew worried.",
  excerptTranslation: "투자자들의 우려 속에 주가가 급락했습니다.",
}

describe("VocabularyCard", () => {
  describe("정상 케이스", () => {
    it("초기 렌더링 시 flipped 클래스 없이 앞면 내용(단어/뜻)이 문서에 존재한다", () => {
      const { container } = render(<VocabularyCard item={item} />)
      expect(screen.getByText("bear market")).toBeInTheDocument()
      expect(screen.getByText(item.definition)).toBeInTheDocument()
      expect(container.querySelector(".vocabulary-card")).not.toHaveClass("flipped")
    })

    it("카드를 클릭하면 flipped 클래스가 토글된다", () => {
      const { container } = render(<VocabularyCard item={item} />)
      const card = container.querySelector(".vocabulary-card")

      fireEvent.click(card)
      expect(card).toHaveClass("flipped")

      fireEvent.click(card)
      expect(card).not.toHaveClass("flipped")
    })

    it("Enter 키를 누르면 flipped 클래스가 토글된다", () => {
      const { container } = render(<VocabularyCard item={item} />)
      const card = container.querySelector(".vocabulary-card")

      fireEvent.keyDown(card, { key: "Enter" })
      expect(card).toHaveClass("flipped")
    })

    it("뒷면에 원문 발췌 문장과 그 한국어 번역이 함께 렌더링된다", () => {
      render(<VocabularyCard item={item} />)
      expect(screen.getByText(item.excerpt)).toBeInTheDocument()
      expect(screen.getByText(item.excerptTranslation)).toBeInTheDocument()
    })
  })

  describe("실패하는 경우 (excerpt/excerptTranslation 없음 → 폴백)", () => {
    it("excerpt가 없으면 안내 문구가 렌더링된다", () => {
      render(<VocabularyCard item={{ ...item, excerpt: null }} />)
      expect(screen.getByText("저장된 원문 발췌가 없어요.")).toBeInTheDocument()
    })

    it("excerptTranslation이 없으면 번역 문단 자체가 렌더링되지 않는다", () => {
      const { container } = render(<VocabularyCard item={{ ...item, excerptTranslation: null }} />)
      expect(container.querySelector(".vocabulary-excerpt-translation")).not.toBeInTheDocument()
    })
  })
})
