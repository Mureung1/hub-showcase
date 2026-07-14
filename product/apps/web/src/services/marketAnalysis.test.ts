import { afterEach, describe, expect, it, vi } from "vitest";

import { loadMarketAnalysis, loadMarketComparison, type MarketAnalysis } from "./marketAnalysis";

const analysis = {
  market_id: "3110562",
  market_name: "연남동 골목상권",
  market_type: "골목상권",
  district_name: "마포구",
  admin_dong_name: "연남동",
  category: "카페",
  period: "20251",
  score: {
    formula_version: "1.0.0",
    score: 74,
    band: "양호",
    confidence: 80,
    confidence_label: "높음",
    decision_status: "supported",
    cluster: { classification: "ordinary", explanation: "일반 상권" },
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

    const result = await loadMarketAnalysis("연남", "카페", new AbortController().signal);

    expect(result).toEqual({ analysis, source: "api" });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("uses the verified snapshot when the API is unavailable", async () => {
    const snapshot = {
      analyses: {
        "연남:카페": analysis,
      },
    };
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response(null, { status: 503 }))
      .mockResolvedValueOnce(new Response(JSON.stringify(snapshot), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const result = await loadMarketAnalysis("연남", "카페", new AbortController().signal);

    expect(result).toEqual({ analysis, source: "snapshot" });
    expect(fetchMock).toHaveBeenCalledTimes(2);
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

    const result = await loadMarketComparison("카페", new AbortController().signal);

    expect(Object.keys(result)).toEqual(["연남", "홍대", "합정"]);
  });
});
