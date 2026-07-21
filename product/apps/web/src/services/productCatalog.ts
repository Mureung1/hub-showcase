import type { AnalysisRadius } from "../features/analysis/types";
import type { Category, MarketKey } from "../features/market/types";
import { apiUrl } from "./api";

export type SupportedMarket = {
  key: MarketKey;
  market_id: string;
  name: string;
  address: string;
  center: [number, number];
};

export type ProductCatalog = {
  markets: SupportedMarket[];
  categories: Array<{ name: Category; codes: string[] }>;
  radii: AnalysisRadius[];
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

export async function loadProductCatalog(signal: AbortSignal): Promise<ProductCatalog> {
  const response = await fetch(apiUrl("/api/v1/catalog"), { signal });
  if (!response.ok) throw new Error(`API ${response.status}`);
  return (await response.json()) as ProductCatalog;
}
