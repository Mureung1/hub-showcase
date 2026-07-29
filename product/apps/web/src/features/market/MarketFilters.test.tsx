import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { PRODUCT_CATALOG_BOOTSTRAP, type ProductCategory } from "../../services/productCatalog";
import type { NearbyStoreState } from "../analysis/useNearbyStores";
import type { Market } from "./types";
import { MarketFilters } from "./MarketFilters";

function market(name: string): Market {
  return {
    name,
    address: "마포구 일대",
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
}

const markets = {
  연남: market("연남동 골목상권"),
  홍대: market("홍대입구역 상권"),
  합정: market("합정역 상권"),
};

function renderFilters({
  catalogState = "connecting",
  supportedCategories = PRODUCT_CATALOG_BOOTSTRAP.categories,
  marketKey = "연남",
  sameCategoryCount = null,
  nearbyState = "loading",
}: {
  catalogState?: "ranked" | "connecting" | "bootstrap" | "error";
  supportedCategories?: ProductCategory[];
  marketKey?: "연남" | "홍대" | "합정";
  sameCategoryCount?: number | null;
  nearbyState?: NearbyStoreState;
} = {}) {
  const callback = vi.fn();
  render(
    <MarketFilters
      marketKey={marketKey}
      markets={markets}
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
      layer="density"
      topic="competition"
      boundaryVisible
      storesVisible
      visibleStores={[]}
      selectedStoreName={null}
      sameCategoryCount={sameCategoryCount}
      nearbyState={nearbyState}
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

const rankedCategories: ProductCategory[] = [
  {
    name: "체육",
    codes: [],
    coverage: "partial",
    rank: 1,
    store_count: 216,
    store_counts_by_market: { 연남: 48, 홍대: 92, 합정: 76 },
  },
  {
    name: "미용",
    codes: [],
    coverage: "partial",
    rank: 2,
    store_count: 201,
    store_counts_by_market: { 연남: 64, 홍대: 43, 합정: 94 },
  },
];

describe("MarketFilters catalog state", () => {
  it("keeps the restored category visible without rendering bootstrap choices", () => {
    renderFilters();

    expect(screen.getAllByText("체육").length).toBeGreaterThan(0);
    expect(screen.getByText("선택 상태 유지 중")).toBeInTheDocument();
    expect(
      screen.getByText("선택한 업종을 유지한 채 현재 상권의 업종 순위를 불러오고 있습니다."),
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "카페" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "음식점" })).not.toBeInTheDocument();
  });

  it("shows and sorts counts for the selected market without support labels", () => {
    renderFilters({
      catalogState: "ranked",
      marketKey: "연남",
      supportedCategories: rankedCategories,
    });

    expect(screen.getByText("64곳")).toBeInTheDocument();
    expect(screen.getByText("48곳")).toBeInTheDocument();
    expect(screen.queryByText("부분 지원")).not.toBeInTheDocument();
    expect(screen.queryByText("216곳")).not.toBeInTheDocument();
    expect(
      screen.getByText("연남동 골목상권 안의 최신 점포 위치 수가 많은 순서입니다."),
    ).toBeInTheDocument();

    const categories = within(screen.getByLabelText("분석 업종 선택"));
    const beauty = categories.getByRole("button", { name: "미용" });
    const sports = categories.getByRole("button", { name: "체육" });
    expect(beauty.compareDocumentPosition(sports) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("changes the count and ordering when another market is selected", () => {
    renderFilters({
      catalogState: "ranked",
      marketKey: "홍대",
      supportedCategories: rankedCategories,
    });

    expect(screen.getByText("92곳")).toBeInTheDocument();
    expect(screen.getByText("43곳")).toBeInTheDocument();
    expect(
      screen.getByText("홍대입구역 상권 안의 최신 점포 위치 수가 많은 순서입니다."),
    ).toBeInTheDocument();

    const categories = within(screen.getByLabelText("분석 업종 선택"));
    const sports = categories.getByRole("button", { name: "체육" });
    const beauty = categories.getByRole("button", { name: "미용" });
    expect(sports.compareDocumentPosition(beauty) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("uses the live nearby count for the selected category", () => {
    renderFilters({
      catalogState: "ranked",
      nearbyState: "ready",
      sameCategoryCount: 7,
      supportedCategories: [
        {
          name: "체육",
          codes: [],
          coverage: "partial",
          rank: 1,
          store_count: 216,
          store_counts_by_market: { 연남: 48 },
        },
        {
          name: "미용",
          codes: [],
          coverage: "partial",
          rank: 2,
          store_count: 201,
        },
      ],
    });

    expect(screen.getByText("7곳")).toBeInTheDocument();
    expect(within(screen.getByLabelText("분석 업종 선택")).getByText("—")).toBeInTheDocument();
    expect(screen.queryByText("0곳")).not.toBeInTheDocument();
  });
});
