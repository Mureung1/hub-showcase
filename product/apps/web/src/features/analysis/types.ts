export type AnalysisRadius = 100 | 300 | 500 | 1000;
export type AnalysisMoveMode = "idle" | "moving";

export type NearbyStore = {
  id: string;
  name: string;
  address: string | null;
  category_code: string | null;
  category_name: string | null;
  distance_meters: number;
  latitude: number;
  longitude: number;
  source_snapshot_id: string;
};

export type NearbyStoreResponse = {
  center: { latitude: number; longitude: number };
  radius: AnalysisRadius;
  market_id: string;
  market_name: string;
  total_count: number;
  same_category_count: number;
  category_counts: Record<string, number>;
  returned_count: number;
  truncated: boolean;
  stores: NearbyStore[];
  aggregation_scope: "radius";
};
