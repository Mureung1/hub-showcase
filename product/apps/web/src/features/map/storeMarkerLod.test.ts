import { describe, expect, it } from "vitest";

import type { MarketStore } from "../market/types";
import {
  groupStoreMarkers,
  isStoreMarkerDeemphasized,
  STORE_MARKER_DETAIL_ZOOM,
} from "./storeMarkerLod";

const stores: MarketStore[] = [
  {
    id: "a",
    name: "카페 A",
    category: "카페",
    distance: "10m",
    score: 70,
    longitude: 126.9257,
    latitude: 37.5661,
  },
  {
    id: "b",
    name: "카페 B",
    category: "카페",
    distance: "20m",
    score: 70,
    longitude: 126.92572,
    latitude: 37.56612,
  },
];

const widerStores: MarketStore[] = [
  {
    ...stores[0],
    longitude: 126.9261193211658,
  },
  {
    ...stores[1],
    longitude: 126.92670863739883,
    latitude: 37.5661,
  },
];

describe("store marker level of detail", () => {
  it("groups nearby stores at wider zoom levels", () => {
    expect(groupStoreMarkers(stores, 14.5, null)).toEqual([{ store: stores[0], count: 2 }]);
  });

  it("uses larger grouping cells for remaining 3D fallback markers", () => {
    expect(groupStoreMarkers(widerStores, 15.2, null, "analysis")).toHaveLength(2);
    expect(groupStoreMarkers(widerStores, 15.2, null, "storefront3d")).toEqual([
      { store: widerStores[0], count: 2 },
    ]);
  });

  it("keeps the selected store separate from a nearby group", () => {
    const groups = groupStoreMarkers(stores, 14.5, "카페 B", "storefront3d");

    expect(groups).toHaveLength(2);
    expect(groups.find((group) => group.store.name === "카페 B")).toEqual({
      store: stores[1],
      count: 1,
    });
  });

  it("shows every store individually at detailed zoom", () => {
    expect(groupStoreMarkers(stores, STORE_MARKER_DETAIL_ZOOM, null, "storefront3d")).toEqual([
      { store: stores[0], count: 1 },
      { store: stores[1], count: 1 },
    ]);
  });

  it("de-emphasizes only surrounding markers after a 3D store is selected", () => {
    expect(isStoreMarkerDeemphasized(stores[0], "카페 A", "storefront3d")).toBe(false);
    expect(isStoreMarkerDeemphasized(stores[1], "카페 A", "storefront3d")).toBe(true);
    expect(isStoreMarkerDeemphasized(stores[1], "카페 A", "analysis")).toBe(false);
    expect(isStoreMarkerDeemphasized(stores[1], null, "storefront3d")).toBe(false);
  });
});
