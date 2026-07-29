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
      render(<BottomSheet {...baseProps} onSave={() => {}} onDismiss={() => {}} />)
      expect(screen.queryByPlaceholderText("이 판단을 내린 이유를 한 줄로 남겨보세요")).not.toBeInTheDocument()
    })

    it("'내 생각 남기기'를 클릭하면 textarea가 나타난다", () => {
      render(<BottomSheet {...baseProps} onSave={() => {}} onDismiss={() => {}} />)
      fireEvent.click(screen.getByText("내 생각 남기기"))
      expect(screen.getByPlaceholderText("이 판단을 내린 이유를 한 줄로 남겨보세요")).toBeInTheDocument()
    })

    it("메모를 입력하고 '인사이트 노트에 저장'을 누르면 onSave가 trim된 메모로 호출된다", () => {
      const onSave = vi.fn()
      render(<BottomSheet {...baseProps} onSave={onSave} onDismiss={() => {}} />)
      fireEvent.click(screen.getByText("내 생각 남기기"))
      fireEvent.change(screen.getByPlaceholderText("이 판단을 내린 이유를 한 줄로 남겨보세요"), {
        target: { value: "  과매도 국면이라 판단  " },
      })
      fireEvent.click(screen.getByText("인사이트 노트에 저장"))
      expect(onSave).toHaveBeenCalledWith("과매도 국면이라 판단")
    })

    it("우측 상단 닫기 버튼을 누르면 onDismiss만 호출되고 onSave는 호출되지 않는다", () => {
      const onSave = vi.fn()
      const onDismiss = vi.fn()
      render(<BottomSheet {...baseProps} onSave={onSave} onDismiss={onDismiss} />)
      fireEvent.click(screen.getByLabelText("저장하지 않고 닫기"))
      expect(onDismiss).toHaveBeenCalledTimes(1)
      expect(onSave).not.toHaveBeenCalled()
    })

    it("오버레이를 클릭하면 onDismiss만 호출되고 onSave는 호출되지 않는다", () => {
      const onSave = vi.fn()
      const onDismiss = vi.fn()
      render(<BottomSheet {...baseProps} onSave={onSave} onDismiss={onDismiss} />)
      fireEvent.click(screen.getByRole("dialog").parentElement)
      expect(onDismiss).toHaveBeenCalledTimes(1)
      expect(onSave).not.toHaveBeenCalled()
    })
  })

  describe("slow lane 로딩 중", () => {
    it("marketSentiment/insight가 아직 undefined면 로딩 문구를 보여준다", () => {
      render(
        <BottomSheet
          decision="buy"
          marketSentiment={undefined}
          insight={undefined}
          onSave={() => {}}
          onDismiss={() => {}}
        />,
      )
      expect(screen.getByText("분석 중...")).toBeInTheDocument()
      expect(screen.getByText("AI가 비교 결과를 분석하고 있습니다...")).toBeInTheDocument()
    })

    it("marketSentiment/insight가 도착하면 정상 비교 UI를 보여준다", () => {
      render(<BottomSheet {...baseProps} onSave={() => {}} onDismiss={() => {}} />)
      expect(screen.queryByText("분석 중...")).not.toBeInTheDocument()
      expect(screen.getByText("테스트 인사이트")).toBeInTheDocument()
    })
  })

  describe("빈 값", () => {
    it("메모를 입력하지 않고 저장하면 onSave가 null로 호출된다", () => {
      const onSave = vi.fn()
      render(<BottomSheet {...baseProps} onSave={onSave} onDismiss={() => {}} />)
      fireEvent.click(screen.getByText("인사이트 노트에 저장"))
      expect(onSave).toHaveBeenCalledWith(null)
    })

    it("공백만 입력하고 저장하면 onSave가 null로 호출된다", () => {
      const onSave = vi.fn()
      render(<BottomSheet {...baseProps} onSave={onSave} onDismiss={() => {}} />)
      fireEvent.click(screen.getByText("내 생각 남기기"))
      fireEvent.change(screen.getByPlaceholderText("이 판단을 내린 이유를 한 줄로 남겨보세요"), {
        target: { value: "   " },
      })
      fireEvent.click(screen.getByText("인사이트 노트에 저장"))
      expect(onSave).toHaveBeenCalledWith(null)
    })
  })
})
