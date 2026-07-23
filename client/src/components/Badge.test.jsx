import { render, screen } from "@testing-library/react"
import { describe, it, expect } from "vitest"
import Badge from "./Badge"

describe("Badge", () => {
  describe("실패하는 경우 (LABELS에 없는 decision → 폴백)", () => {
    it("LABELS에 정의되지 않은 decision 값이면 원본 값을 그대로 렌더링한다", () => {
      render(<Badge decision="unknown" />)
      expect(screen.getByText("unknown")).toBeInTheDocument()
    })

    it("decision이 undefined면 LABELS 조회도 undefined, 폴백도 undefined라 아무 텍스트도 렌더링하지 않는다", () => {
      render(<Badge decision={undefined} />)
      expect(screen.queryByText(/./)).not.toBeInTheDocument()
    })
  })
})
