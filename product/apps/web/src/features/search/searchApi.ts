import { apiUrl } from "../../services/api";

export type MarketSearchResult = {
  result_type: "market" | "store";
  id: string;
  name: string;
  address: string | null;
  category_code: string | null;
  category_name: string | null;
  longitude: number;
  latitude: number;
  market_id: string;
  market_name: string;
};

type MarketSearchResponse = {
  query: string;
  results: MarketSearchResult[];
};

export async function loadMarketSearch(query: string, signal: AbortSignal) {
  const parameters = new URLSearchParams({ query, limit: "10" });
  const response = await fetch(apiUrl(`/api/v1/search?${parameters}`), { signal });
  if (!response.ok) throw new Error(`Search API ${response.status}`);
  return (await response.json()) as MarketSearchResponse;
}
