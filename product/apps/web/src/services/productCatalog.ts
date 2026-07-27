import type { AnalysisRadius } from "../features/analysis/types";
import type { AnalysisCategory, Category, MarketKey } from "../features/market/types";
import { apiUrl } from "./api";

export type SupportedMarket = {
  key: MarketKey;
  market_id: string;
  name: string;
  address: string;
  center: [number, number];
};

export type ProductCategory = {
  name: Category;
  codes: string[];
  coverage?: "full" | "partial";
  analysis_category?: AnalysisCategory | null;
  rank?: number | null;
  store_count?: number | null;
  market_count?: number | null;
};

export type ProductCatalog = {
  markets: SupportedMarket[];
  categories: ProductCategory[];
  radii: AnalysisRadius[];
  ranking_basis?: "supported_market_unique_store_count" | "bootstrap";
};

export const DEMO_ANALYSIS_PERIOD = "20251";

export const DEMO_MARKETS: SupportedMarket[] = [
  {
    key: "연남",
    market_id: "3110562",
    name: "연남동 골목상권",
    address: "마포구 동교로 38길 일대",
    center: [126.922787722224, 37.5634957461626],
  },
  {
    key: "홍대",
    market_id: "3120103",
    name: "홍대입구역 상권",
    address: "마포구 양화로 일대",
    center: [126.919317433833, 37.5527848842777],
  },
  {
    key: "합정",
    market_id: "3120101",
    name: "합정역 상권",
    address: "마포구 양화로 45 일대",
    center: [126.91324192136, 37.5492309987762],
  },
];

// Stable fallback while the free API instance wakes up. The remote API replaces
// this list with the data-ranked Top 7 when the runtime database is available.
export const PRODUCT_CATALOG_BOOTSTRAP: ProductCatalog = {
  markets: DEMO_MARKETS,
  categories: [
    {
      name: "카페",
      codes: ["CS100010"],
      coverage: "full",
      analysis_category: "카페",
    },
    {
      name: "음식점",
      codes: [
        "CS100001",
        "CS100002",
        "CS100003",
        "CS100004",
        "CS100006",
        "CS100007",
        "CS100008",
        "CS100009",
      ],
      coverage: "full",
      analysis_category: "음식점",
    },
    {
      name: "베이커리",
      codes: ["CS100005"],
      coverage: "full",
      analysis_category: "베이커리",
    },
    {
      name: "편의점",
      codes: ["CS300002"],
      coverage: "full",
      analysis_category: "편의점",
    },
  ],
  radii: [100, 300, 500],
  ranking_basis: "bootstrap",
};

export async function loadProductCatalog(signal: AbortSignal): Promise<ProductCatalog> {
  const response = await fetch(apiUrl("/api/v1/catalog"), { signal });
  if (!response.ok) throw new Error(`API ${response.status}`);
  return (await response.json()) as ProductCatalog;
}
