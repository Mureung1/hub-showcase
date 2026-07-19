import type { Category, MarketKey } from "../features/market/types";
import { apiUrl } from "./api";
import type { SupportedMarket } from "./productCatalog";

export type AnalysisSource = "api" | "demo";
export type MarketAnalysisOptions = {
  allowDemoSnapshot?: boolean;
  period: string;
};
export type AnalysisPeriods = {
  periods: string[];
  default_period: string;
  policy: "latest_complete_quarter";
};
export type ScoreDecisionBlocker =
  | "fixture_present"
  | "coverage_below_60"
  | "confidence_below_60"
  | "required_metric_missing"
  | "peer_sample_too_small"
  | "cluster_evidence_too_weak";

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
    data_coverage: number;
    decision_blockers: ScoreDecisionBlocker[];
    components: Array<{
      key: string;
      label: string;
      score: number;
      weight_percent: number;
      observed_score: number | null;
      coverage: number;
      configured_weight_percent: number;
      evidence_keys: string[];
    }>;
    cluster: {
      classification: string;
      local_quotient: number;
      adjustment: number;
      raw_adjustment: number;
      evidence_confidence: number;
      evidence_keys: string[];
      explanation: string;
    };
    metric_evidence: Array<{
      metric_key: string;
      reliability: number;
      freshness_policy: "fast" | "cohort" | "structural";
      freshness_grace_days: number;
      freshness_expire_days: number;
      freshness: number;
      sample_basis: "known" | "unknown" | "administrative_population";
      sample_strength: number;
      evidence_strength: number;
    }>;
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
    flow_time_buckets: Array<{
      label: string;
      value: number | null;
    }>;
    area_sqm: number | null;
  };
  evidence: Array<{
    metric: string;
    source_name: string;
    source_url: string;
    period: string;
    source_type: "official" | "derived";
  }>;
  rankings?: Array<{
    id: "same_type" | "supported";
    label: string;
    metrics: Array<{
      key: string;
      label: string;
      value: number | null;
      unit: string;
      rank: number | null;
      peer_count: number;
      percentile: number | null;
      period: string;
      peer_group: string;
      direction: "descending";
      available: boolean;
      reason: string | null;
    }>;
  }>;
};

type Snapshot = {
  analyses: Record<string, MarketAnalysis>;
};

async function loadSnapshot(signal: AbortSignal) {
  const response = await fetch("/data/market-analysis.json", { signal });
  if (!response.ok) throw new Error(`Snapshot ${response.status}`);
  return (await response.json()) as Snapshot;
}

export async function loadMarketAnalysis(
  market: SupportedMarket,
  category: Category,
  signal: AbortSignal,
  options: MarketAnalysisOptions,
): Promise<{ analysis: MarketAnalysis; source: AnalysisSource }> {
  if (options.allowDemoSnapshot) {
    const snapshot = await loadSnapshot(signal);
    const analysis = snapshot.analyses[`${market.key}:${category}`];
    if (!analysis) throw new Error("Snapshot analysis is missing.");
    return { analysis, source: "demo" };
  }

  const query = new URLSearchParams({ category, period: options.period });
  const response = await fetch(apiUrl(`/api/v1/markets/${market.market_id}?${query}`), {
    signal,
  });
  if (!response.ok) throw new Error(`API ${response.status}`);
  return { analysis: (await response.json()) as MarketAnalysis, source: "api" };
}

export async function loadMarketComparison(
  markets: SupportedMarket[],
  category: Category,
  signal: AbortSignal,
  options: MarketAnalysisOptions,
): Promise<Record<MarketKey, MarketAnalysis>> {
  if (options.allowDemoSnapshot) {
    const snapshot = await loadSnapshot(signal);
    return Object.fromEntries(
      markets.map((market) => {
        const analysis = snapshot.analyses[`${market.key}:${category}`];
        if (!analysis) throw new Error(`Snapshot analysis is missing: ${market.key}:${category}`);
        return [market.key, analysis];
      }),
    ) as Record<MarketKey, MarketAnalysis>;
  }

  const analyses = await Promise.all(
    markets.map(async (market) => {
      const { analysis } = await loadMarketAnalysis(market, category, signal, options);
      return [market.key, analysis] as const;
    }),
  );
  return Object.fromEntries(analyses) as Record<MarketKey, MarketAnalysis>;
}

export async function loadAnalysisPeriods(category: Category, signal: AbortSignal) {
  const query = new URLSearchParams({ category });
  const response = await fetch(apiUrl(`/api/v1/analysis/periods?${query}`), { signal });
  if (!response.ok) throw new Error(`API ${response.status}`);
  return (await response.json()) as AnalysisPeriods;
}
