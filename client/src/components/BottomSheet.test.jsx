import { render, screen, fireEvent } from "@testing-library/react"
import { describe, it, expect, vi } from "vitest"
import BottomSheet from "./BottomSheet"

const baseProps = {
  decision: "buy",
  marketSentiment: "bullish",
  insight: "테스트 인사이트",
}

describe("BottomSheet", () => {
  describe("정상 케이스", () => {
    it("메모 트리거 클릭 전에는 textarea가 보이지 않는다", () => {
      render(<BottomSheet {...baseProps} onClose={() => {}} />)
      expect(screen.queryByPlaceholderText("이 판단을 내린 이유를 한 줄로 남겨보세요")).not.toBeInTheDocument()
    })

    it("'내 생각 남기기'를 클릭하면 textarea가 나타난다", () => {
      render(<BottomSheet {...baseProps} onClose={() => {}} />)
      fireEvent.click(screen.getByText("내 생각 남기기"))
      expect(screen.getByPlaceholderText("이 판단을 내린 이유를 한 줄로 남겨보세요")).toBeInTheDocument()
    })

    it("메모를 입력하고 닫기 버튼을 누르면 onClose가 trim된 메모로 호출된다", () => {
      const onClose = vi.fn()
      render(<BottomSheet {...baseProps} onClose={onClose} />)
      fireEvent.click(screen.getByText("내 생각 남기기"))
      fireEvent.change(screen.getByPlaceholderText("이 판단을 내린 이유를 한 줄로 남겨보세요"), {
        target: { value: "  과매도 국면이라 판단  " },
      })
      fireEvent.click(screen.getByText("닫기"))
      expect(onClose).toHaveBeenCalledWith("과매도 국면이라 판단")
    })
  })

  describe("빈 값", () => {
    it("메모를 입력하지 않고 닫으면 onClose가 null로 호출된다", () => {
      const onClose = vi.fn()
      render(<BottomSheet {...baseProps} onClose={onClose} />)
      fireEvent.click(screen.getByText("닫기"))
      expect(onClose).toHaveBeenCalledWith(null)
    })

    it("공백만 입력하고 닫으면 onClose가 null로 호출된다", () => {
      const onClose = vi.fn()
      render(<BottomSheet {...baseProps} onClose={onClose} />)
      fireEvent.click(screen.getByText("내 생각 남기기"))
      fireEvent.change(screen.getByPlaceholderText("이 판단을 내린 이유를 한 줄로 남겨보세요"), {
        target: { value: "   " },
      })
      fireEvent.click(screen.getByText("닫기"))
      expect(onClose).toHaveBeenCalledWith(null)
    })
  })
})
