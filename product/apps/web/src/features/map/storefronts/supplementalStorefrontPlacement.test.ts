import { describe, expect, it } from "vitest";

import type { MarketStore } from "../../market/types";
import {
  buildSupplementalStorefronts,
  MAX_VISIBLE_STOREFRONT_OBJECTS,
  selectSupplementalStorefrontCandidates,
} from "./supplementalStorefrontPlacement";

function store(id: string): MarketStore {
  return {
    id,
    name: `카페 ${id}`,
    category: "카페",
    categoryCode: "I21201",
    distance: "10m",
    score: 70,
    longitude: 126.92 + Number(id.replace(/\D/g, "") || 0) * 0.00001,
    latitude: 37.55,
  };
}

function placement(storeId: string, buildingId: string, storeCountInBuilding: number) {
  return {
    storeId,
    building: {
      buildingId,
      center: [126.92, 37.55] as [number, number],
      plotSizeMeters: 6,
      heightMeters: 12,
      storeCountInBuilding,
    },
  };
}

describe("selected storefront focus placement", () => {
  it("does not create a 3D object before a store is explicitly selected", () => {
    expect(
      selectSupplementalStorefrontCandidates({
        stores: [store("1"), store("2")],
        existingObjectCount: 0,
        selected: null,
      }),
    ).toEqual([]);
  });

  it("uses a one-object budget and selects only the chosen store", () => {
    const stores = [store("1"), store("2")];
    const selected = stores[1];
    const candidates = selectSupplementalStorefrontCandidates({
      stores,
      existingObjectCount: 0,
      selected,
    });

    expect(MAX_VISIBLE_STOREFRONT_OBJECTS).toBe(1);
    expect(candidates).toEqual([
      expect.objectContaining({
        id: selected.id,
        placementMode: "selected-focus",
      }),
    ]);
    expect(
      selectSupplementalStorefrontCandidates({
        stores,
        existingObjectCount: 1,
        selected,
      }),
    ).toEqual([]);
  });

  it("anchors the focus to a mixed-use building without replacing it", () => {
    const candidate = selectSupplementalStorefrontCandidates({
      stores: [store("1")],
      existingObjectCount: 0,
      selected: store("1"),
    });
    const storefronts = buildSupplementalStorefronts({
      candidates: candidate,
      placements: [placement("1", "way/mixed", 4)],
      occupiedBuildingIds: new Set(),
    });

    expect(storefronts).toEqual([
      expect.objectContaining({
        placementMode: "selected-focus",
        building: expect.objectContaining({
          id: "way/mixed",
          storeCountInBuilding: 4,
        }),
      }),
    ]);
  });

  it("does not duplicate an already occupied building focus", () => {
    const candidate = selectSupplementalStorefrontCandidates({
      stores: [store("1")],
      existingObjectCount: 0,
      selected: store("1"),
    });

    expect(
      buildSupplementalStorefronts({
        candidates: candidate,
        placements: [placement("1", "way/occupied", 1)],
        occupiedBuildingIds: new Set(["way/occupied"]),
      }),
    ).toEqual([]);
  });
});
