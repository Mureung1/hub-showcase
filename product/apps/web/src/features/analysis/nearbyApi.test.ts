import { afterEach, describe, expect, it, vi } from "vitest";

import { loadNearbyStores, NearbyApiError } from "./nearbyApi";

afterEach(() => vi.unstubAllGlobals());

describe("nearby API", () => {
  it("serializes the confirmed center and radius", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        center: { longitude: 126.9257, latitude: 37.5661 },
        radius: 300,
        market_id: "3110562",
        market_name: "연트럴파크",
        total_count: 1,
        same_category_count: 1,
        category_counts: { 카페: 1 },
        returned_count: 1,
        truncated: false,
        stores: [],
        evidence: [],
        category_coverage: {
          status: "full",
          requested_category: "카페",
          analysis_category: "카페",
          available_metrics: ["store_points", "competition"],
          unavailable_metrics: [],
          reason: "지원",
        },
        aggregation_scope: "radius",
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    await loadNearbyStores(
      { center: [126.9257, 37.5661], radius: 300, category: "카페" },
      new AbortController().signal,
    );

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/api/v1/stores/nearby?"),
      expect.any(Object),
    );
    const url = new URL(fetchMock.mock.calls[0][0], "http://localhost");
    expect(Object.fromEntries(url.searchParams)).toEqual({
      longitude: "126.9257",
      latitude: "37.5661",
      radius: "300",
      category: "카페",
    });
  });

  it("keeps the HTTP status for unsupported and service errors", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 422 }));

    await expect(
      loadNearbyStores(
        { center: [127.1, 37.4], radius: 300, category: "카페" },
        new AbortController().signal,
      ),
    ).rejects.toEqual(new NearbyApiError(422));
  });
});
