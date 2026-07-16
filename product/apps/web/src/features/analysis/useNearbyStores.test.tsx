import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { NearbyStoreResponse } from "./types";
import { useNearbyStores } from "./useNearbyStores";

function payload(center: [number, number], totalCount: number): NearbyStoreResponse {
  return {
    center: { longitude: center[0], latitude: center[1] },
    radius: 300,
    market_id: "3110562",
    market_name: "연트럴파크",
    total_count: totalCount,
    same_category_count: totalCount,
    category_counts: totalCount ? { 카페: totalCount } : {},
    returned_count: 0,
    truncated: false,
    stores: [],
    evidence: [],
    category_coverage: {
      status: totalCount ? "full" : "unavailable",
      requested_category: "카페",
      analysis_category: "카페",
      available_metrics: totalCount ? ["store_points", "competition"] : [],
      unavailable_metrics: [],
      reason: totalCount ? "지원" : "근거 없음",
    },
    aggregation_scope: "radius",
  };
}

function okResponse(body: NearbyStoreResponse) {
  return { ok: true, status: 200, json: async () => body };
}

afterEach(() => vi.unstubAllGlobals());

describe("useNearbyStores", () => {
  it("distinguishes empty and unsupported responses", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(okResponse(payload([126.9228, 37.5635], 0)))
      .mockResolvedValueOnce({ ok: false, status: 422 });
    vi.stubGlobal("fetch", fetchMock);
    const { result, rerender } = renderHook(
      ({ center }) => useNearbyStores({ center, radius: 300, category: "카페" }),
      { initialProps: { center: [126.9228, 37.5635] as [number, number] } },
    );

    await waitFor(() => expect(result.current.state).toBe("empty"));
    rerender({ center: [127.1, 37.4] });
    await waitFor(() => expect(result.current.state).toBe("unsupported"));
  });

  it("retries the last confirmed request after a service failure", async () => {
    const center: [number, number] = [126.9228, 37.5635];
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, status: 503 })
      .mockResolvedValueOnce(okResponse(payload(center, 2)));
    vi.stubGlobal("fetch", fetchMock);
    const { result } = renderHook(() => useNearbyStores({ center, radius: 300, category: "카페" }));

    await waitFor(() => expect(result.current.state).toBe("error"));
    act(() => result.current.retry());
    await waitFor(() => expect(result.current.state).toBe("ready"));
    expect(result.current.data?.total_count).toBe(2);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("does not let a stale request overwrite the latest center", async () => {
    let resolveFirst: ((value: ReturnType<typeof okResponse>) => void) | undefined;
    const firstResponse = new Promise<ReturnType<typeof okResponse>>((resolve) => {
      resolveFirst = resolve;
    });
    const oldCenter: [number, number] = [126.9228, 37.5635];
    const newCenter: [number, number] = [126.9215, 37.5632];
    const fetchMock = vi
      .fn()
      .mockReturnValueOnce(firstResponse)
      .mockResolvedValueOnce(okResponse(payload(newCenter, 3)));
    vi.stubGlobal("fetch", fetchMock);
    const { result, rerender } = renderHook(
      ({ center }) => useNearbyStores({ center, radius: 300, category: "카페" }),
      { initialProps: { center: oldCenter } },
    );

    rerender({ center: newCenter });
    await waitFor(() => expect(result.current.data?.center.longitude).toBe(newCenter[0]));
    await act(async () => {
      resolveFirst?.(okResponse(payload(oldCenter, 9)));
      await firstResponse;
    });

    expect(result.current.data?.center.longitude).toBe(newCenter[0]);
    expect(result.current.data?.total_count).toBe(3);
  });
});
