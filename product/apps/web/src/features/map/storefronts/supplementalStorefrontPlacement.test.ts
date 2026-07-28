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

describe("supplemental storefront placement", () => {
  it("uses only the remaining object budget and prioritizes the selected store", () => {
    const stores = Array.from({ length: 8 }, (_, index) => store(String(index + 1)));
    const selected = stores[7];

    const candidates = selectSupplementalStorefrontCandidates({
      stores,
      existingObjectCount: MAX_VISIBLE_STOREFRONT_OBJECTS - 3,
      selected,
    });

    expect(candidates).toHaveLength(3);
    expect(candidates[0].id).toBe(selected.id);
  });

  it("fully replaces single-store buildings and uses rooftop markers for mixed-use buildings", () => {
    const candidates = selectSupplementalStorefrontCandidates({
      stores: [store("1"), store("2")],
      existingObjectCount: 0,
      selected: null,
    });
    const storefronts = buildSupplementalStorefronts({
      candidates,
      placements: [placement("1", "way/one", 1), placement("2", "way/two", 4)],
      occupiedBuildingIds: new Set(),
    });

    expect(storefronts.map((item) => item.placementMode)).toEqual([
      "replace-building",
      "rooftop-marker",
    ]);
  });

  it("keeps one object per building and skips buildings already used by a primary replacement", () => {
    const candidates = selectSupplementalStorefrontCandidates({
      stores: [store("1"), store("2"), store("3")],
      existingObjectCount: 0,
      selected: null,
    });
    const storefronts = buildSupplementalStorefronts({
      candidates,
      placements: [
        placement("1", "way/shared", 3),
        placement("2", "way/shared", 3),
        placement("3", "way/occupied", 1),
      ],
      occupiedBuildingIds: new Set(["way/occupied"]),
    });

    expect(storefronts).toHaveLength(1);
    expect(storefronts[0].building?.id).toBe("way/shared");
  });
});
