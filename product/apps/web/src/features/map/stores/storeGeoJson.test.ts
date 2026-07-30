import { describe, expect, it } from "vitest";

import type { MarketStore } from "../../market/types";
import {
  createStoreFeatureCollection,
  storeFeatureIdentity,
  storeSelectionKey,
} from "./storeGeoJson";

function store(index: number, overrides: Partial<MarketStore> = {}): MarketStore {
  return {
    id: `store-${index}`,
    name: `음식점 ${index}`,
    category: "음식점",
    categoryCode: "I20101",
    distance: `${index}m`,
    score: 72,
    longitude: 126.92 + index * 0.000001,
    latitude: 37.55 + index * 0.000001,
    ...overrides,
  };
}

describe("createStoreFeatureCollection", () => {
  it("keeps every dense-market store in one GeoJSON source", () => {
    const stores = Array.from({ length: 755 }, (_, index) => store(index));

    const collection = createStoreFeatureCollection(stores);

    expect(collection.features).toHaveLength(755);
    expect(collection.features[754]?.properties.storeKey).toBe("store-754");
    expect(collection.features[0]?.properties.categoryGroup).toBe("food");
  });

  it("keeps render identity separate from the existing selection key", () => {
    const withoutId = store(1, {
      id: undefined,
      name: "같은 이름 점포",
      longitude: 126.921,
      latitude: 37.551,
    });

    expect(storeSelectionKey(withoutId)).toBe("같은 이름 점포");
    expect(storeFeatureIdentity(withoutId)).toBe("같은 이름 점포:126.921:37.551");
  });
});
