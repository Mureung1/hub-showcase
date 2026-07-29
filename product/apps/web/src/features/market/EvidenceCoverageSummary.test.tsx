import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type { MarketAnalysis } from "../../services/marketAnalysis";
import { EvidenceCoverageSummary } from "./EvidenceCoverageSummary";

const selection = {
  name: "카페",
  code: "CS100010",
  analysisCategory: "카페",
  coverage: "full",
} as const;

function analysisWith(values: {
  sales: number | null;
  flow: number | null;
}): MarketAnalysis {
  return {
    period: "20254",
    raw: {
      monthly_sales_amount: values.sales,
      total_flow: values.flow,
    },
  } as unknown as MarketAnalysis;
}

describe("EvidenceCoverageSummary", () => {
  it("shows the number of confirmed evidence groups", () => {
    render(
      <EvidenceCoverageSummary
        categorySelection={selection}
        analysis={analysisWith({ sales: 120_000_000, flow: 50_000 })}
      />,
    );

    expect(screen.getByText("3개 중 3개 확인")).toBeInTheDocument();
    expect(screen.getByText(/핵심 자료가 모두 확인되었습니다/)).toBeInTheDocument();
  });

  it("names missing evidence and explains its impact", () => {
    render(
      <EvidenceCoverageSummary
        categorySelection={selection}
        analysis={analysisWith({ sales: null, flow: 50_000 })}
      />,
    );

    expect(screen.getByText("3개 중 2개 확인")).toBeInTheDocument();
    expect(screen.getByText("선택 분기에 매출 자료가 없습니다.")).toBeInTheDocument();
    expect(screen.getByText(/추정매출 자료가 없어/)).toBeInTheDocument();
    expect(screen.getByText(/점수의 확실성을 낮출 수 있습니다/)).toBeInTheDocument();
  });

  it("does not render a full-analysis summary for partial categories", () => {
    const { container } = render(
      <EvidenceCoverageSummary
        categorySelection={{ ...selection, coverage: "partial", analysisCategory: null }}
        analysis={analysisWith({ sales: null, flow: null })}
      />,
    );

    expect(container).toBeEmptyDOMElement();
  });
});
