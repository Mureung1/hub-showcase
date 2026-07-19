import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type { Market, MarketStore } from "./types";
import { useStoreSelection } from "./useStoreSelection";

const store: MarketStore = {
  id: "store-1",
  name: "테스트 카페",
  category: "카페",
  distance: "20m",
  score: 70,
  longitude: 126.92,
  latitude: 37.56,
};

function options(nearbyStores: MarketStore[]) {
  return {
    marketKey: "연남" as const,
    marketKeyById: { market1: "연남" as const },
    score: 70,
    analysisScope: "radius" as const,
    nearbyStores,
    marketStores: [] as Market["stores"],
  };
}

describe("useStoreSelection", () => {
  it("clears a selected nearby store when it leaves the current result set", () => {
    const { result, rerender } = renderHook(
      ({ stores }) => useStoreSelection(options(stores)),
      { initialProps: { stores: [store] } },
    );

    act(() => result.current.selectListedStore(store.name));
    expect(result.current.selected?.id).toBe("store-1");
    rerender({ stores: [] });
    expect(result.current.selected).toBeNull();
  });

  it("maps a store search result and clears it together with nearby selection", () => {
    const { result } = renderHook(() => useStoreSelection(options([])));
    act(() =>
      result.current.selectSearchResult({
        result_type: "store",
        id: "search-1",
        name: "검색 카페",
        market_id: "market1",
        market_name: "연남",
        category_code: "I21201",
        category_name: "카페",
        address: "서울",
        longitude: 126.93,
        latitude: 37.57,
      }),
    );
    expect(result.current.selected?.name).toBe("검색 카페");
    act(() => result.current.clearSelection());
    expect(result.current.selected).toBeNull();
  });
});
