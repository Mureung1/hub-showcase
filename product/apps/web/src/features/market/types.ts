export type Category = "카페" | "음식점" | "베이커리" | "편의점";
export type MarketKey = "연남" | "홍대" | "합정";
export type MapMode = "localtwin" | "original";
export type LayerMode = "density" | "demand";
export type AnalysisScope = "market" | "radius" | "admin-area";
export type AnalysisTopic =
  "overview" | "stores" | "sales" | "competition" | "flow" | "population" | "amenities";
export type CategoryCoverageStatus = "full" | "partial" | "unavailable";

export type CategorySelection = {
  name: string;
  code: string | null;
  analysisCategory: Category | null;
  coverage: CategoryCoverageStatus;
};

export type MarketStore = {
  id?: string;
  name: string;
  category: string;
  categoryCode?: string | null;
  address?: string;
  distance: string;
  score: number;
  longitude: number;
  latitude: number;
};

export type Market = {
  name: string;
  address: string;
  center: [number, number];
  score: number;
  grade: string;
  footfall: string;
  workPopulation: string;
  residentPopulation: string;
  opening: number;
  closing: number;
  demand: Array<number | null>;
  demandLabels: string[];
  insight: string;
  stores: MarketStore[];
  landmarks: Array<{ name: string; longitude: number; latitude: number }>;
};
