import type { Category, MarketKey } from "../features/market/types";
import { apiUrl } from "./api";

export type AnalysisSource = "api" | "snapshot";

export type MarketAnalysis = {
  market_id: string;
  market_name: string;
  market_type: string | null;
  district_name: string | null;
  admin_dong_name: string | null;
  category: Category;
  period: string;
  score: {
    formula_version: string;
    score: number;
    band: string;
    confidence: number;
    confidence_label: string;
    decision_status: "supported" | "insufficient_evidence";
    cluster: { classification: string; explanation: string };
    reasons: Array<{
      tone: "positive" | "caution" | "info";
      label: string;
      message: string;
      value: number;
      unit: string;
      source_name: string;
      period: string;
    }>;
    limitations: string[];
  };
  raw: {
    category_store_count: number;
    total_store_count: number;
    opening_count: number;
    closure_count: number;
    monthly_sales_amount: number | null;
    monthly_sales_count: number | null;
    total_flow: number | null;
    flow_by_time: number[];
    area_sqm: number | null;
  };
  evidence: Array<{
    metric: string;
    source_name: string;
    source_url: string;
    period: string;
    source_type: "official" | "derived";
  }>;
};

const marketIds: Record<MarketKey, string> = {
  연남: "3110562",
  홍대: "3120103",
  합정: "3120101",
};

type Snapshot = {
  analyses: Record<string, MarketAnalysis>;
};

export async function loadMarketAnalysis(
  marketKey: MarketKey,
  category: Category,
  signal: AbortSignal,
): Promise<{ analysis: MarketAnalysis; source: AnalysisSource }> {
  const query = new URLSearchParams({ category, period: "20251" });
  try {
    const response = await fetch(apiUrl(`/api/v1/markets/${marketIds[marketKey]}?${query}`), {
      signal,
    });
    if (!response.ok) throw new Error(`API ${response.status}`);
    return { analysis: (await response.json()) as MarketAnalysis, source: "api" };
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") throw error;
    const response = await fetch("/data/market-analysis.json", { signal });
    if (!response.ok) throw new Error(`Snapshot ${response.status}`);
    const snapshot = (await response.json()) as Snapshot;
    const analysis = snapshot.analyses[`${marketKey}:${category}`];
    if (!analysis) throw new Error("Snapshot analysis is missing.");
    return { analysis, source: "snapshot" };
  }
}

export async function loadMarketComparison(
  category: Category,
  signal: AbortSignal,
): Promise<Record<MarketKey, MarketAnalysis>> {
  const response = await fetch("/data/market-analysis.json", { signal });
  if (!response.ok) throw new Error(`Snapshot ${response.status}`);
  const snapshot = (await response.json()) as Snapshot;
  return Object.fromEntries(
    (Object.keys(marketIds) as MarketKey[]).map((marketKey) => {
      const analysis = snapshot.analyses[`${marketKey}:${category}`];
      if (!analysis) throw new Error(`Snapshot analysis is missing: ${marketKey}:${category}`);
      return [marketKey, analysis];
    }),
  ) as Record<MarketKey, MarketAnalysis>;
}
