import { useEffect, useState } from "react";

import {
  loadMarketAnalysis,
  loadMarketComparison,
  type AnalysisSource,
  type MarketAnalysis,
} from "../../services/marketAnalysis";
import {
  loadAdminAreaBackground,
  type AdminAreaBackground,
} from "../../services/adminAreaBackground";
import { isTestEnvironment } from "./model";
import type { Category, MarketKey } from "./types";

export type AnalysisState = "loading" | "ready" | "unavailable" | "error";

export function useMarketAnalysis(marketKey: MarketKey, category: Category | null) {
  const allowDemoSnapshot = import.meta.env.VITE_DEMO_MODE === "true";
  const [analysis, setAnalysis] = useState<MarketAnalysis | null>(null);
  const [analysisSource, setAnalysisSource] = useState<AnalysisSource | null>(null);
  const [analysisState, setAnalysisState] = useState<AnalysisState>("loading");
  const [comparison, setComparison] = useState<Record<MarketKey, MarketAnalysis> | null>(null);
  const [background, setBackground] = useState<AdminAreaBackground | null>(null);
  const [backgroundState, setBackgroundState] = useState<AnalysisState>("loading");
  const [analysisRetryToken, setAnalysisRetryToken] = useState(0);

  useEffect(() => {
    if (isTestEnvironment() || typeof fetch === "undefined") return;
    const controller = new AbortController();
    setBackground(null);
    setBackgroundState("loading");
    loadAdminAreaBackground(marketKey, controller.signal)
      .then((result) => {
        setBackground(result);
        setBackgroundState("ready");
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setBackgroundState("error");
      });
    return () => controller.abort();
  }, [marketKey]);

  useEffect(() => {
    if (!category) {
      setAnalysis(null);
      setAnalysisSource(null);
      setAnalysisState("unavailable");
      return;
    }
    if (isTestEnvironment() || typeof fetch === "undefined") return;
    const controller = new AbortController();
    setAnalysis(null);
    setAnalysisSource(null);
    setAnalysisState("loading");
    loadMarketAnalysis(marketKey, category, controller.signal, { allowDemoSnapshot })
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
  }, [allowDemoSnapshot, analysisRetryToken, category, marketKey]);

  useEffect(() => {
    if (!category) {
      setComparison(null);
      return;
    }
    if (isTestEnvironment() || typeof fetch === "undefined") return;
    const controller = new AbortController();
    loadMarketComparison(category, controller.signal, { allowDemoSnapshot })
      .then(setComparison)
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setComparison(null);
      });
    return () => controller.abort();
  }, [allowDemoSnapshot, analysisRetryToken, category]);

  return {
    analysis,
    analysisSource,
    analysisState,
    comparison,
    background,
    backgroundState,
    retryAnalysis: () => setAnalysisRetryToken((current) => current + 1),
  };
}
