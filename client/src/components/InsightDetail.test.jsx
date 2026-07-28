import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import { describe, it, expect, vi, afterEach } from "vitest"
import InsightDetail from "./InsightDetail"
import { updateDecisionMemo } from "../api/decisions.js"

vi.mock("../api/decisions.js", () => ({
  updateDecisionMemo: vi.fn(),
}))

const baseItem = {
  id: "decision-1",
  title: "테스트 기사",
  decision: "buy",
  marketSentiment: "bullish",
  summaryBullets: ["요약1"],
  insight: "인사이트",
  url: "https://example.com/article",
  createdAt: "2026-07-26T00:00:00+09:00",
  memo: null,
}

describe("InsightDetail", () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe("정상 케이스", () => {
    it("memo가 없으면 안내 placeholder가 보인다", () => {
      render(<InsightDetail item={baseItem} onMemoSaved={() => {}} />)
      expect(screen.getByText("판단 근거를 한 줄로 남겨보세요 (탭하여 작성)")).toBeInTheDocument()
    })

    it("memo가 있으면 해당 내용이 보인다", () => {
      render(<InsightDetail item={{ ...baseItem, memo: "기존 메모" }} onMemoSaved={() => {}} />)
      expect(screen.getByText("기존 메모")).toBeInTheDocument()
    })

    it("탭하면 textarea로 전환되고 기존 memo가 채워진다", () => {
      render(<InsightDetail item={{ ...baseItem, memo: "기존 메모" }} onMemoSaved={() => {}} />)
      fireEvent.click(screen.getByText("기존 메모"))
      expect(screen.getByDisplayValue("기존 메모")).toBeInTheDocument()
    })

    it("저장 클릭 시 updateDecisionMemo가 (id, trim된 memo)로 호출되고 onMemoSaved가 호출된다", async () => {
      updateDecisionMemo.mockResolvedValue({ id: "decision-1", memo: "새 메모" })
      const onMemoSaved = vi.fn()
      render(<InsightDetail item={baseItem} onMemoSaved={onMemoSaved} />)

      fireEvent.click(screen.getByText("판단 근거를 한 줄로 남겨보세요 (탭하여 작성)"))
      fireEvent.change(screen.getByRole("textbox"), { target: { value: "  새 메모  " } })
      fireEvent.click(screen.getByText("저장"))

      await waitFor(() => {
        expect(updateDecisionMemo).toHaveBeenCalledWith("decision-1", "새 메모")
        expect(onMemoSaved).toHaveBeenCalledWith("decision-1", "새 메모")
      })
    })

    it("요약/인사이트/원문 링크가 아코디언 없이 항상 노출된다", () => {
      render(<InsightDetail item={baseItem} onMemoSaved={() => {}} />)
      expect(screen.getByText("요약1")).toBeInTheDocument()
      expect(screen.getByText("인사이트")).toBeInTheDocument()
      expect(screen.getByLabelText("원문 기사 보기")).toHaveAttribute(
        "href",
        "https://example.com/article",
      )
    })
  })
})
