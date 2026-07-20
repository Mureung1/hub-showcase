import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type { AdminAreaBackground } from "../../services/adminAreaBackground";
import type { MarketAnalysis } from "../../services/marketAnalysis";
import { DataPeriodSummary } from "./DataPeriodSummary";

describe("DataPeriodSummary", () => {
  it("keeps different source periods visible instead of implying one aligned date", () => {
    const analysis = {
      evidence: [
        {
          metric: "sales",
          source_name: "서울시 상권분석서비스",
          source_url: "https://data.seoul.go.kr/sales",
          period: "20251",
          source_type: "official",
        },
      ],
    } as unknown as MarketAnalysis;
    const background = {
      evidence: [
        {
          metric: "resident_population",
          source_name: "KOSIS 주민등록인구",
          source_url: "https://kosis.kr/population",
          period: "202512",
          geography: "administrative_area",
          collected_at: "2026-07-16T00:00:00Z",
          status: "historical",
        },
        {
          metric: "workers",
          source_name: "KOSIS 전국사업체조사",
          source_url: "https://kosis.kr/business",
          period: "2024",
          geography: "administrative_area",
          collected_at: "2026-07-16T00:00:00Z",
          status: "historical",
        },
      ],
    } as unknown as AdminAreaBackground;

    render(
      <DataPeriodSummary
        analysis={analysis}
        background={background}
        nearbyEvidence={[
          {
            source_snapshot_id: "stores-1",
            provider: "국토교통부",
            dataset: "상가업소정보",
            source_url: "https://www.data.go.kr/stores",
            period: "202603",
            collected_at: "2026-07-16T00:00:00Z",
          },
        ]}
      />,
    );

    expect(screen.getByText("2025년 1분기")).toBeInTheDocument();
    expect(screen.getByText("2025년 12월")).toBeInTheDocument();
    expect(screen.getByText("2024년")).toBeInTheDocument();
    expect(screen.getByText("2026년 3월")).toBeInTheDocument();
    expect(screen.getByText(/같은 날짜로 강제하지 않습니다/)).toBeInTheDocument();
    expect(screen.getByText(/기간을 바꾸는 기능은 아직 지원하지 않습니다/)).toBeInTheDocument();
  });
});
