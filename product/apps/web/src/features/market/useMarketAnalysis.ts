import { useEffect, useState } from "react";

import {
  loadMarketAnalysis,
  loadMarketComparison,
  loadAnalysisPeriods,
  type AnalysisSource,
  type MarketAnalysis,
} from "../../services/marketAnalysis";
import {
  loadAdminAreaBackground,
  type AdminAreaBackground,
} from "../../services/adminAreaBackground";
import { isTestEnvironment } from "./model";
import type { Category, MarketKey } from "./types";
import { DEMO_ANALYSIS_PERIOD, type SupportedMarket } from "../../services/productCatalog";

export type AnalysisState = "loading" | "ready" | "unavailable" | "error";

export function useMarketAnalysis(
  market: SupportedMarket,
  markets: SupportedMarket[],
  category: Category | null,
  period: string,
  useDemoSnapshot = false,
  apiReady = true,
) {
  const allowDemoSnapshot = useDemoSnapshot || import.meta.env.VITE_DEMO_MODE === "true";
  const [analysis, setAnalysis] = useState<MarketAnalysis | null>(null);
  const [analysisSource, setAnalysisSource] = useState<AnalysisSource | null>(null);
  const [analysisState, setAnalysisState] = useState<AnalysisState>("loading");
  const [comparison, setComparison] = useState<Record<MarketKey, MarketAnalysis> | null>(null);
  const [background, setBackground] = useState<AdminAreaBackground | null>(null);
  const [backgroundState, setBackgroundState] = useState<AnalysisState>("loading");
  const [analysisRetryToken, setAnalysisRetryToken] = useState(0);
  const [availablePeriods, setAvailablePeriods] = useState<string[]>([]);
  const [periodAvailability, setPeriodAvailability] = useState<
    Record<string, Array<"stores" | "sales" | "flow">>
  >({});
  const [defaultPeriod, setDefaultPeriod] = useState<string | null>(null);

  useEffect(() => {
    if (!category || isTestEnvironment() || typeof fetch === "undefined") return;
    if (!apiReady) {
      setAvailablePeriods([]);
      setPeriodAvailability({});
      setDefaultPeriod(null);
      return;
    }
    if (allowDemoSnapshot) {
      setAvailablePeriods([DEMO_ANALYSIS_PERIOD]);
      setPeriodAvailability({ [DEMO_ANALYSIS_PERIOD]: ["stores", "sales", "flow"] });
      setDefaultPeriod(DEMO_ANALYSIS_PERIOD);
      return;
    }
    const controller = new AbortController();
    loadAnalysisPeriods(category, controller.signal)
      .then((result) => {
        setAvailablePeriods(result.periods);
        setPeriodAvailability(result.period_availability ?? {});
        setDefaultPeriod(result.default_period);
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setAvailablePeriods([]);
        setPeriodAvailability({});
        setDefaultPeriod(null);
      });
    return () => controller.abort();
  }, [allowDemoSnapshot, apiReady, category]);

  useEffect(() => {
    if (!apiReady) {
      setBackground(null);
      setBackgroundState("loading");
      return;
    }
    if (isTestEnvironment() || typeof fetch === "undefined") return;
    const controller = new AbortController();
    setBackground(null);
    setBackgroundState("loading");
    loadAdminAreaBackground(market.market_id, controller.signal)
      .then((result) => {
        setBackground(result);
        setBackgroundState("ready");
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setBackgroundState("error");
      });
    return () => controller.abort();
  }, [apiReady, market.market_id]);

  useEffect(() => {
    if (!category) {
      setAnalysis(null);
      setAnalysisSource(null);
      setAnalysisState("unavailable");
      return;
    }
    if (!apiReady) {
      setAnalysis(null);
      setAnalysisSource(null);
      setAnalysisState("loading");
      return;
    }
    if (!period || isTestEnvironment() || typeof fetch === "undefined") return;
    const controller = new AbortController();
    setAnalysis(null);
    setAnalysisSource(null);
    setAnalysisState("loading");
    loadMarketAnalysis(market, category, controller.signal, { allowDemoSnapshot, period })
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
  }, [allowDemoSnapshot, analysisRetryToken, apiReady, category, market, period]);

  useEffect(() => {
    if (!category) {
      setComparison(null);
      return;
    }
    if (!apiReady) {
      setComparison(null);
      return;
    }
    if (!period || isTestEnvironment() || typeof fetch === "undefined") return;
    const controller = new AbortController();
    loadMarketComparison(markets, category, controller.signal, { allowDemoSnapshot, period })
      .then(setComparison)
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setComparison(null);
      });
    return () => controller.abort();
  }, [allowDemoSnapshot, analysisRetryToken, apiReady, category, markets, period]);

  return {
    analysis,
    analysisSource,
    analysisState,
    comparison,
    background,
    backgroundState,
    availablePeriods,
    periodAvailability,
    defaultPeriod,
    retryAnalysis: () => setAnalysisRetryToken((current) => current + 1),
  };
}
