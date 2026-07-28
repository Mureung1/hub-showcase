import { render, screen, fireEvent } from "@testing-library/react"
import { describe, it, expect, vi } from "vitest"
import DecisionButtons from "./DecisionButtons"

describe("DecisionButtons", () => {
  describe("정상 케이스", () => {
    it("초기 렌더링 시 판단 버튼 그룹이 보이지 않는다", () => {
      render(<DecisionButtons onDecide={() => {}} />)
      expect(screen.queryByText("🐂 Bullish")).not.toBeInTheDocument()
    })

    it("유도 문구를 클릭하면 판단 버튼 그룹이 나타난다", () => {
      render(<DecisionButtons onDecide={() => {}} />)
      fireEvent.click(screen.getByText("이 기사를 읽고, 오늘의 모의 투자 판단을 내려보세요"))
      expect(screen.getByText("🐂 Bullish")).toBeInTheDocument()
    })

    it("유도 문구를 다시 클릭하면 판단 버튼 그룹이 다시 숨겨진다", () => {
      render(<DecisionButtons onDecide={() => {}} />)
      const prompt = screen.getByText("이 기사를 읽고, 오늘의 모의 투자 판단을 내려보세요")
      fireEvent.click(prompt)
      fireEvent.click(prompt)
      expect(screen.queryByText("🐂 Bullish")).not.toBeInTheDocument()
    })

    it("Enter 키로도 판단 버튼 그룹이 나타난다", () => {
      render(<DecisionButtons onDecide={() => {}} />)
      fireEvent.keyDown(screen.getByText("이 기사를 읽고, 오늘의 모의 투자 판단을 내려보세요"), {
        key: "Enter",
      })
      expect(screen.getByText("🐂 Bullish")).toBeInTheDocument()
    })

    it("버튼을 클릭하면 onDecide가 해당 값으로 호출된다", () => {
      const onDecide = vi.fn()
      render(<DecisionButtons onDecide={onDecide} />)
      fireEvent.click(screen.getByText("이 기사를 읽고, 오늘의 모의 투자 판단을 내려보세요"))
      fireEvent.click(screen.getByText("🐂 Bullish"))
      expect(onDecide).toHaveBeenCalledWith("buy")
    })
  })
})
