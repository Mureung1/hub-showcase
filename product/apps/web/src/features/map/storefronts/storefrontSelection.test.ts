import { describe, expect, it } from "vitest";

import type { MarketStore } from "../../market/types";
import { selectMapStores } from "./storefrontSelection";

function store(name: string, longitude: number, latitude = 37.56): MarketStore {
  return {
    id: name,
    name,
    category: "카페",
    distance: "0m",
    score: 50,
    longitude,
    latitude,
  };
}

describe("selectMapStores", () => {
  const stores = [
    store("선택", 126.92),
    store("겹침", 126.9201),
    store("후보1", 126.921),
    store("후보2", 126.922),
    store("후보3", 126.923),
  ];

  it("keeps the selected store and removes nearby collisions deterministically", () => {
    const options = {
      selectedName: "선택",
      focus: null,
      limit: 3,
      minimumDistanceMeters: 40,
    };

    expect(selectMapStores(stores, options).map(({ name }) => name)).toEqual([
      "선택",
      "후보1",
      "후보2",
    ]);
    expect(selectMapStores(stores, options).map(({ name }) => name)).toEqual([
      "선택",
      "후보1",
      "후보2",
    ]);
  });

  it("reserves space around a custom 3D focus that is not in the HTML marker list", () => {
    expect(
      selectMapStores(stores.slice(1), {
        selectedName: "선택",
        focus: [126.92, 37.56],
        limit: 2,
        minimumDistanceMeters: 40,
      }).map(({ name }) => name),
    ).toEqual(["후보1", "후보2"]);
  });

  it("uses only stores inside the current map view while preserving the selected store", () => {
    expect(
      selectMapStores(stores, {
        selectedName: "선택",
        focus: null,
        limit: 4,
        minimumDistanceMeters: 1,
        bounds: { west: 126.9208, south: 37.559, east: 126.9222, north: 37.561 },
      }).map(({ name }) => name),
    ).toEqual(["선택", "후보1", "후보2"]);
  });
});
