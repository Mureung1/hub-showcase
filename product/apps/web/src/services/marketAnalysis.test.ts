import { afterEach, describe, expect, it, vi } from "vitest";

import {
  loadAnalysisPeriods,
  loadMarketAnalysis,
  loadMarketComparison,
  type MarketAnalysis,
} from "./marketAnalysis";
import type { SupportedMarket } from "./productCatalog";

const markets: SupportedMarket[] = [
  { key: "연남", market_id: "3110562", name: "연남동", address: "마포구", center: [0, 0] },
  { key: "홍대", market_id: "3120103", name: "홍대", address: "마포구", center: [0, 0] },
  { key: "합정", market_id: "3120101", name: "합정", address: "마포구", center: [0, 0] },
];

const analysis = {
  market_id: "3110562",
  market_name: "연남동 골목상권",
  market_type: "골목상권",
  district_name: "마포구",
  admin_dong_name: "연남동",
  category: "카페",
  period: "20251",
  score: {
    formula_version: "1.1.0",
    score: 74,
    band: "양호",
    confidence: 80,
    confidence_label: "높음",
    decision_status: "supported",
    data_coverage: 100,
    decision_blockers: [],
    components: [],
    cluster: {
      classification: "ordinary",
      local_quotient: 1,
      adjustment: 0,
      raw_adjustment: 0,
      evidence_confidence: 0,
      evidence_keys: [],
      explanation: "일반 상권",
    },
    metric_evidence: [],
    reasons: [],
    limitations: [],
  },
  raw: {
    category_store_count: 19,
    total_store_count: 80,
    opening_count: 7,
    closure_count: 3,
    monthly_sales_amount: null,
    monthly_sales_count: null,
    total_flow: 41_820,
    flow_by_time: [1, 2, 3, 4, 5, 6],
    flow_time_buckets: [
      { label: "00:00-06:00", value: 1 },
      { label: "06:00-11:00", value: 2 },
      { label: "11:00-14:00", value: 3 },
      { label: "14:00-17:00", value: 4 },
      { label: "17:00-21:00", value: 5 },
      { label: "21:00-24:00", value: 6 },
    ],
    area_sqm: null,
  },
  evidence: [],
} satisfies MarketAnalysis;

afterEach(() => vi.unstubAllGlobals());

describe("market analysis service", () => {
  it("uses the API response when the product API is available", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(analysis), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await loadMarketAnalysis(markets[0], "카페", new AbortController().signal, {
      period: "20251",
    });

    expect(result).toEqual({ analysis, source: "api" });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0]?.[0]).toContain("period=20251");
  });

  it("loads only complete analysis periods from the API", async () => {
    const periods = {
      periods: ["20251", "20244"],
      default_period: "20251",
      policy: "latest_complete_quarter",
    };
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response(JSON.stringify(periods), { status: 200 })),
    );

    await expect(loadAnalysisPeriods("카페", new AbortController().signal)).resolves.toEqual(
      periods,
    );
  });

  it("does not hide an API failure with a snapshot by default", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 503 }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      loadMarketAnalysis(markets[0], "카페", new AbortController().signal, { period: "20251" }),
    ).rejects.toThrow("API 503");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("uses a verified snapshot only when demo mode is explicit", async () => {
    const snapshot = {
      analyses: {
        "연남:카페": analysis,
      },
    };
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response(JSON.stringify(snapshot), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const result = await loadMarketAnalysis(markets[0], "카페", new AbortController().signal, {
      allowDemoSnapshot: true,
      period: "20251",
    });

    expect(result).toEqual({ analysis, source: "demo" });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("builds a comparison only when every market snapshot exists", async () => {
    const snapshot = {
      analyses: {
        "연남:카페": analysis,
        "홍대:카페": { ...analysis, market_id: "3120103", market_name: "홍대입구역 상권" },
        "합정:카페": { ...analysis, market_id: "3120101", market_name: "합정역 상권" },
      },
    };
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response(JSON.stringify(snapshot), { status: 200 })),
    );

    const result = await loadMarketComparison(markets, "카페", new AbortController().signal, {
      allowDemoSnapshot: true,
      period: "20251",
    });

    expect(Object.keys(result)).toEqual(["연남", "홍대", "합정"]);
  });
});
