import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { AdminAreaBackground } from "../../services/adminAreaBackground";
import type { MarketAnalysis } from "../../services/marketAnalysis";
import { MarketInspector } from "./MarketInspector";
import { FLOW_TIME_BUCKET_LABELS } from "./model";
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
  demandLabels: FLOW_TIME_BUCKET_LABELS,
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
  topic: "population" | "competition" | "stores" | "flow" = "population",
  analysisState: "loading" | "ready" | "error" = analysis ? "ready" : "loading",
  onAnalysisRetry = vi.fn(),
  marketValue: Market = market,
) {
  render(
    <MarketInspector
      market={marketValue}
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
      analysisState={analysisState}
      analysisScope="market"
      topic={topic}
      onAnalysisRetry={onAnalysisRetry}
      onClosePanel={vi.fn()}
      onClearSelection={vi.fn()}
      onEvidenceOpen={vi.fn()}
      onActiveHourChange={vi.fn()}
    />,
  );
}

describe("MarketInspector population evidence", () => {
  it("shows an API error without static analysis values and retries explicitly", () => {
    const retry = vi.fn();
    renderInspector(null, "error", null, "competition", "error", retry);

    expect(screen.getByRole("alert")).toHaveTextContent("상권 분석 데이터를 불러오지 못했습니다.");
    expect(screen.queryByText("입지 점수")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "다시 시도" }));
    expect(retry).toHaveBeenCalledTimes(1);
  });

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
      raw: { opening_count: 0, closure_count: 0 },
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

  it("shows actual quarterly opening and closure totals instead of a fake monthly trend", () => {
    const analysis = {
      period: "20251",
      raw: { opening_count: 12, closure_count: 7 },
    } as unknown as MarketAnalysis;

    renderInspector(background, "ready", analysis, "stores");

    expect(screen.getByText("개·폐업 현황")).toBeInTheDocument();
    expect(screen.getByText("2025년 1분기")).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "개업 12개, 폐업 7개" })).toBeInTheDocument();
    expect(screen.getByText("순증 +5개")).toBeInTheDocument();
    expect(screen.getByText(/월별 변화가 아닌 선택 분기 합계/)).toBeInTheDocument();
    expect(screen.queryByText("개·폐업 추이")).not.toBeInTheDocument();
  });

  it("renders the six source time buckets without inventing times after 24:00", () => {
    const analysis = {
      period: "20251",
      raw: {
        opening_count: 0,
        closure_count: 0,
        flow_time_buckets: FLOW_TIME_BUCKET_LABELS.map((label, index) => ({
          label,
          value: index === 3 ? null : index + 1,
        })),
      },
    } as unknown as MarketAnalysis;
    const marketWithSourceBuckets = {
      ...market,
      demand: [17, 33, 50, null, 83, 100],
      demandLabels: FLOW_TIME_BUCKET_LABELS,
    };

    renderInspector(
      background,
      "ready",
      analysis,
      "flow",
      "ready",
      vi.fn(),
      marketWithSourceBuckets,
    );

    expect(screen.getByText("서울 길단위인구가 제공하는 6개 시간 구간입니다.")).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /유동인구 상대값|데이터 없음/ })).toHaveLength(6);
    expect(screen.getByRole("button", { name: "14:00-17:00 데이터 없음" })).toBeDisabled();
    expect(screen.queryByText(/26/)).not.toBeInTheDocument();
  });
});
