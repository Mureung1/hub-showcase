import { useEffect, useState } from "react";

import {
  loadMarketAnalysis,
  loadMarketComparison,
  type AnalysisSource,
  type MarketAnalysis,
} from "../../services/marketAnalysis";
import { isTestEnvironment } from "./model";
import type { Category, MarketKey } from "./types";

export type AnalysisState = "loading" | "ready" | "error";

export function useMarketAnalysis(marketKey: MarketKey, category: Category) {
  const [analysis, setAnalysis] = useState<MarketAnalysis | null>(null);
  const [analysisSource, setAnalysisSource] = useState<AnalysisSource | null>(null);
  const [analysisState, setAnalysisState] = useState<AnalysisState>("loading");
  const [comparison, setComparison] = useState<Record<MarketKey, MarketAnalysis> | null>(null);

  useEffect(() => {
    if (isTestEnvironment() || typeof fetch === "undefined") return;
    const controller = new AbortController();
    setAnalysis(null);
    setAnalysisSource(null);
    setAnalysisState("loading");
    loadMarketAnalysis(marketKey, category, controller.signal)
      .then((result) => {
        setAnalysis(result.analysis);
        setAnalysisSource(result.source);
        setAnalysisState("ready");
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setAnalysisState("error");
      });
    return () => controller.abort();
  }, [category, marketKey]);

  useEffect(() => {
    if (isTestEnvironment() || typeof fetch === "undefined") return;
    const controller = new AbortController();
    loadMarketComparison(category, controller.signal)
      .then(setComparison)
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setComparison(null);
      });
    return () => controller.abort();
  }, [category]);

  return { analysis, analysisSource, analysisState, comparison };
}
