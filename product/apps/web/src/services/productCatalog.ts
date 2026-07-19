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

export async function loadProductCatalog(signal: AbortSignal): Promise<ProductCatalog> {
  const response = await fetch(apiUrl("/api/v1/catalog"), { signal });
  if (!response.ok) throw new Error(`API ${response.status}`);
  return (await response.json()) as ProductCatalog;
}
