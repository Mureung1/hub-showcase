import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { AdminAreaBackground } from "../../services/adminAreaBackground";
import type { MarketAnalysis } from "../../services/marketAnalysis";
import { MarketInspector } from "./MarketInspector";
import type { Market, MarketStore } from "./types";

const store: MarketStore = {
  name: "테스트 카페",
  category: "카페",
  distance: "10m",
  score: 70,
  longitude: 126.9,
  latitude: 37.5,
};

const market: Market = {
  name: "연남",
  address: "서울 마포구",
  center: [126.9, 37.5],
  score: 70,
  grade: "보통",
  footfall: "1,000명",
  workPopulation: "486명",
  residentPopulation: "2,654명",
  opening: 1,
  closing: 1,
  demand: [10, 20, 30, 40, 50, 60],
  insight: "테스트",
  stores: [store],
  landmarks: [],
};

const ranked = {
  value: 100,
  rank: 1,
  peer_count: 3,
  percentile: 33.3,
  unit: "명",
  period: "20251",
  peer_group: "현재 지원 상권",
};

const background: AdminAreaBackground = {
  market_id: "3110562",
  admin_area_code: "1144071000",
  admin_area_name: "연남동",
  mapping_method: "reference-only",
  boundary_note: "상권 경계와 행정동 경계는 다릅니다.",
  market_resident_population: ranked,
  market_workers: ranked,
  market_resident_density: { ...ranked, value: 1200, unit: "명/km²" },
  market_worker_density: { ...ranked, value: 800, unit: "명/km²" },
  resident_population: { ...ranked, period: "202512", peer_group: "현재 지원 행정동" },
  businesses: { ...ranked, unit: "개", period: "2024", peer_group: "현재 지원 행정동" },
  workers: { ...ranked, period: "2024", peer_group: "현재 지원 행정동" },
  evidence: [
    {
      metric: "market_resident_population",
      source_name: "서울시 상권분석서비스 상주인구",
      source_url: "https://data.seoul.go.kr/",
      period: "20251",
      geography: "market",
      collected_at: "2026-07-16T00:00:00Z",
      status: "historical",
    },
  ],
};

function renderInspector(
  value: AdminAreaBackground | null,
  state: "ready" | "error",
  analysis: MarketAnalysis | null = null,
  topic: "population" | "competition" = "population",
) {
  render(
    <MarketInspector
      market={market}
      selected={store}
      score={70}
      categorySelection={{
        name: "카페",
        code: "CS100010",
        analysisCategory: "카페",
        coverage: "full",
      }}
      categoryCoverageReason="전체 지원"
      radius={300}
      activeHour={0}
      sameCategoryCount={1}
      analysis={analysis}
      background={value}
      backgroundState={state}
      topic={topic}
      onCloseSelection={vi.fn()}
      onEvidenceOpen={vi.fn()}
      onActiveHourChange={vi.fn()}
    />,
  );
}

describe("MarketInspector population evidence", () => {
  it("distinguishes market and admin-area values with historical source metadata", () => {
    renderInspector(background, "ready");

    expect(screen.getByText("상권 상주인구")).toBeInTheDocument();
    expect(screen.getByText("행정동 주민")).toBeInTheDocument();
    expect(screen.getByText("상권 경계와 행정동 경계는 다릅니다.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /서울시 상권분석서비스 상주인구/ })).toHaveTextContent(
      "20251 · 과거 기준 · 상권",
    );
  });

  it("does not turn a provider failure into zero or an empty metric", () => {
    renderInspector(null, "error");

    expect(screen.getByText("배후 인구 통계를 불러오지 못했습니다.")).toBeInTheDocument();
    expect(screen.queryByText("0명")).not.toBeInTheDocument();
  });

  it("switches ranking peer groups without mixing their denominators", () => {
    const metric = {
      key: "category_store_count",
      label: "동일 업종 점포",
      value: 19,
      unit: "개",
      rank: 4,
      peer_count: 1025,
      percentile: 0.4,
      period: "20251",
      peer_group: "서울 골목상권",
      direction: "descending" as const,
      available: true,
      reason: null,
    };
    const analysis = {
      period: "20251",
      rankings: [
        { id: "same_type", label: "서울 골목상권", metrics: [metric] },
        {
          id: "supported",
          label: "현재 지원 상권",
          metrics: [{ ...metric, rank: 3, peer_count: 3, percentile: 100 }],
        },
      ],
    } as unknown as MarketAnalysis;
    renderInspector(background, "ready", analysis, "competition");

    expect(screen.getByText("4/1025위")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "지원 상권" }));
    expect(screen.getByText("3/3위")).toBeInTheDocument();
    expect(screen.queryByText("4/1025위")).not.toBeInTheDocument();
  });
});
