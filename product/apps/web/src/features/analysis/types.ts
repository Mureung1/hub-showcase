export type AnalysisRadius = 100 | 300 | 500;
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

export type NearbyEvidence = {
  source_snapshot_id: string;
  provider: string;
  dataset: string;
  source_url: string;
  period: string | null;
  collected_at: string;
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
  evidence: NearbyEvidence[];
  category_coverage: {
    status: "full" | "partial" | "unavailable";
    requested_category: string | null;
    analysis_category: "카페" | "음식점" | "베이커리" | "편의점" | null;
    available_metrics: string[];
    unavailable_metrics: string[];
    reason: string;
  };
  aggregation_scope: "radius";
};
