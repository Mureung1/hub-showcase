import { afterEach, describe, expect, it, vi } from "vitest";

import { loadAdminAreaBackground } from "./adminAreaBackground";

describe("loadAdminAreaBackground", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("loads ranked administrative-area evidence for the selected market", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        market_id: "3110562",
        admin_area_code: "1144071000",
        admin_area_name: "연남동",
        mapping_method: "reference-only",
        boundary_note: "상권 경계와 행정동 경계는 다릅니다.",
        market_resident_population: {
          value: 2654,
          rank: 3,
          peer_count: 3,
          percentile: 100,
          unit: "명",
          period: "20251",
          peer_group: "현재 지원 상권",
        },
        market_workers: {
          value: 486,
          rank: 3,
          peer_count: 3,
          percentile: 100,
          unit: "명",
          period: "20251",
          peer_group: "현재 지원 상권",
        },
        market_resident_density: {
          value: 1200,
          rank: 2,
          peer_count: 3,
          percentile: 66.7,
          unit: "명/km²",
          period: "20251",
          peer_group: "현재 지원 상권",
        },
        market_worker_density: {
          value: 800,
          rank: 3,
          peer_count: 3,
          percentile: 100,
          unit: "명/km²",
          period: "20251",
          peer_group: "현재 지원 상권",
        },
        resident_population: { value: 13782, rank: 3, peer_count: 3 },
        businesses: { value: 3065, rank: 3, peer_count: 3 },
        workers: { value: 8850, rank: 3, peer_count: 3 },
        evidence: [],
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await loadAdminAreaBackground("3110562", new AbortController().signal);

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/api/v1/markets/3110562/admin-area-background"),
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
    expect(result.resident_population.value).toBe(13782);
    expect(result.workers.rank).toBe(3);
  });
});
