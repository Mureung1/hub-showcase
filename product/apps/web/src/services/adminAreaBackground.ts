import { apiUrl } from "./api";

export type RankedValue = {
  value: number;
  rank: number;
  peer_count: number;
  percentile: number;
  unit: string;
  period: string;
  peer_group: string;
};

export type AdminAreaBackground = {
  market_id: string;
  admin_area_code: string;
  admin_area_name: string;
  mapping_method: string;
  boundary_note: string;
  market_resident_population: RankedValue;
  market_workers: RankedValue;
  market_resident_density: RankedValue;
  market_worker_density: RankedValue;
  resident_population: RankedValue;
  businesses: RankedValue;
  workers: RankedValue;
  evidence: Array<{
    metric:
      | "market_resident_population"
      | "market_workers"
      | "resident_population"
      | "businesses"
      | "workers";
    source_name: string;
    source_url: string;
    period: string;
    geography: "market" | "administrative_area";
    collected_at: string;
    status: "historical";
  }>;
};

export async function loadAdminAreaBackground(
  marketId: string,
  signal: AbortSignal,
): Promise<AdminAreaBackground> {
  const response = await fetch(apiUrl(`/api/v1/markets/${marketId}/admin-area-background`), {
    signal,
  });
  if (!response.ok) throw new Error(`API ${response.status}`);
  return (await response.json()) as AdminAreaBackground;
}
