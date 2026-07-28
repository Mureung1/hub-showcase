import { describe, expect, it } from "vitest";

import { buildWorkspaceUrlSearch } from "./useWorkspaceUrlPersistence";

describe("workspace URL persistence", () => {
  it("serializes every filter, map presentation, center, and selected store", () => {
    const parameters = new URLSearchParams(
      buildWorkspaceUrlSearch({
        marketKey: "연남",
        category: "카페",
        selectedCategoryName: "카페",
        selectedCategoryCode: "I21201",
        radius: 300,
        activeHour: 4,
        layer: "density",
        topic: "competition",
        boundaryVisible: true,
        storesVisible: true,
        period: "20254",
        center: [126.922788, 37.563496],
        presentationMode: "storefront3d",
        selectedStoreId: "store-17",
        selectedStoreName: "아이엠",
      }),
    );

    expect(Object.fromEntries(parameters)).toEqual({
      market: "연남",
      category: "카페",
      selectedCategory: "카페",
      categoryCode: "I21201",
      radius: "300",
      hour: "4",
      layer: "density",
      topic: "competition",
      boundary: "1",
      stores: "1",
      period: "20254",
      lng: "126.922788",
      lat: "37.563496",
      view: "storefront3d",
      store: "store-17",
      storeName: "아이엠",
    });
  });

  it("omits optional category and store values when no store is selected", () => {
    const parameters = new URLSearchParams(
      buildWorkspaceUrlSearch({
        marketKey: "합정",
        category: "음식점",
        selectedCategoryName: "음식점",
        selectedCategoryCode: null,
        radius: 100,
        activeHour: 1,
        layer: "demand",
        topic: "flow",
        boundaryVisible: false,
        storesVisible: false,
        period: "",
        center: [126.914, 37.55],
        presentationMode: "analysis",
        selectedStoreId: null,
        selectedStoreName: null,
      }),
    );

    expect(parameters.get("hour")).toBe("1");
    expect(parameters.has("categoryCode")).toBe(false);
    expect(parameters.has("period")).toBe(false);
    expect(parameters.has("store")).toBe(false);
    expect(parameters.has("storeName")).toBe(false);
  });
});
