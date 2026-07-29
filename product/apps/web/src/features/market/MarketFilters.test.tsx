import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { PRODUCT_CATALOG_BOOTSTRAP, type ProductCategory } from "../../services/productCatalog";
import type { Market } from "./types";
import { MarketFilters } from "./MarketFilters";

const market: Market = {
  name: "연남동 골목상권",
  address: "마포구 동교로 일대",
  center: [126.922788, 37.563496],
  score: 0,
  grade: "확인 중",
  footfall: "조회 중",
  workPopulation: "조회 중",
  residentPopulation: "조회 중",
  opening: 0,
  closing: 0,
  demand: [],
  demandLabels: [],
  insight: "",
  stores: [],
  landmarks: [],
};

function renderFilters({
  catalogState = "connecting",
  supportedCategories = PRODUCT_CATALOG_BOOTSTRAP.categories,
  marketKey = "연남",
}: {
  catalogState?: "ranked" | "connecting" | "bootstrap" | "error";
  supportedCategories?: ProductCategory[];
  marketKey?: "연남" | "홍대" | "합정";
} = {}) {
  const callback = vi.fn();
  render(
    <MarketFilters
      marketKey={marketKey}
      markets={{ 연남: market, 홍대: market, 합정: market }}
      supportedCategories={supportedCategories}
      catalogState={catalogState}
      onCatalogRetry={callback}
      category="체육"
      categorySelection={{
        name: "체육",
        code: null,
        analysisCategory: null,
        coverage: "partial",
      }}
      categoryCoverageReason="점포 위치와 경쟁 지표를 제공합니다."
      layer="density"
      topic="competition"
      boundaryVisible
      storesVisible
      visibleStores={[]}
      selectedStoreName={null}
      nearbyState="loading"
      onNearbyRetry={callback}
      onClose={callback}
      onReset={callback}
      onMarketChange={callback}
      onCategoryChange={callback}
      onLayerChange={callback}
      onTopicChange={callback}
      onBoundaryVisibleChange={callback}
      onStoresVisibleChange={callback}
      onStoreChange={callback}
    />,
  );
}

describe("MarketFilters catalog state", () => {
  it("keeps the restored category visible without rendering bootstrap choices", () => {
    renderFilters();

    expect(screen.getAllByText("체육").length).toBeGreaterThan(0);
    expect(screen.getByText("선택 상태 유지 중")).toBeInTheDocument();
    expect(
      screen.getByText("선택한 업종을 유지한 채 데이터 기반 업종 순위를 불러오고 있습니다."),
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "카페" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "음식점" })).not.toBeInTheDocument();
  });

  it("uses the selected market count and places partial support beside the name", () => {
    renderFilters({
      catalogState: "ranked",
      marketKey: "연남",
      supportedCategories: [
        {
          name: "체육",
          codes: [],
          coverage: "partial",
          rank: 1,
          store_count: 216,
          store_counts_by_market: { 연남: 48, 홍대: 92, 합정: 76 },
        },
      ],
    });

    expect(screen.getByText("이 상권 48곳")).toBeInTheDocument();
    expect(screen.queryByText("216곳")).not.toBeInTheDocument();
    expect(screen.getAllByText("부분 지원").length).toBeGreaterThan(0);
    expect(
      screen.getByText("순위는 세 상권 합계, 점포 수는 현재 선택한 상권 기준입니다."),
    ).toBeInTheDocument();
  });
});
