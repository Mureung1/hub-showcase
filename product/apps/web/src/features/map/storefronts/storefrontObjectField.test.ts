import { describe, expect, it } from "vitest";

import type { MarketStore } from "../../market/types";
import { buildStorefrontObjectField } from "./storefrontObjectField";

function store(id: string, category: string, longitude: number, latitude: number): MarketStore {
  return {
    id,
    name: id,
    category,
    categoryCode: null,
    distance: "10m",
    score: 50,
    longitude,
    latitude,
  };
}

describe("buildStorefrontObjectField", () => {
  it("creates one reviewed object only for the currently selected store", () => {
    const cafe = store("cafe", "카페", 126.92, 37.56);
    const beauty = store("beauty", "미용실", 126.921, 37.561);

    expect(
      buildStorefrontObjectField({ stores: [cafe], selected: cafe, bounds: null }),
    ).toMatchObject([{ id: "cafe", categoryCode: "I21201", placementMode: "selected-focus" }]);
    expect(
      buildStorefrontObjectField({ stores: [beauty], selected: null, bounds: null }),
    ).toEqual([]);
    expect(
      buildStorefrontObjectField({ stores: [beauty], selected: beauty, bounds: null }),
    ).toMatchObject([{ id: "beauty", categoryCode: "S20701", placementMode: "selected-focus" }]);
  });

  it("does not keep the previous category object after the store list changes", () => {
    const cafe = store("cafe", "카페", 126.92, 37.56);
    const beauty = store("beauty", "미용실", 126.921, 37.561);

    expect(
      buildStorefrontObjectField({ stores: [beauty], selected: cafe, bounds: null }),
    ).toEqual([]);
  });

  it("does not create a legacy object for an unsupported category", () => {
    const unknown = store("unknown", "기타 서비스", 126.92, 37.56);

    expect(buildStorefrontObjectField({ stores: [unknown], selected: null, bounds: null })).toEqual(
      [],
    );
  });
});
