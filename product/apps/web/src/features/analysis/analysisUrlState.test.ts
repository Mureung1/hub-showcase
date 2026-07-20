import { afterEach, describe, expect, it } from "vitest";

import { readAnalysisUrlState, writeAnalysisUrlState } from "./analysisUrlState";

const defaults = {
  marketKey: "연남" as const,
  category: "카페" as const,
  selectedCategoryName: "카페",
  selectedCategoryCode: null,
  radius: 300 as const,
  layer: "density" as const,
  scope: "radius" as const,
  topic: "overview" as const,
  boundaryVisible: true,
  storesVisible: true,
  period: "20251",
  center: [126.922787722224, 37.5634957461626] as [number, number],
};
const policy = {
  marketKeys: ["연남", "홍대", "합정"] as const,
  categories: ["카페", "음식점", "베이커리", "편의점"] as const,
  radii: [100, 300, 500] as const,
};

afterEach(() => window.history.replaceState({}, "", "/"));

describe("analysis URL state", () => {
  it("restores supported filter and center values", () => {
    window.history.replaceState(
      {},
      "",
      "/?market=홍대&category=음식점&selectedCategory=한식%20음식점업&categoryCode=I20101&radius=500&layer=demand&scope=market&topic=flow&boundary=0&stores=1&period=20244&lng=126.9238&lat=37.5562",
    );

    expect(readAnalysisUrlState(defaults, policy)).toEqual({
      marketKey: "홍대",
      category: "음식점",
      selectedCategoryName: "한식 음식점업",
      selectedCategoryCode: "I20101",
      radius: 500,
      layer: "demand",
      scope: "market",
      topic: "flow",
      boundaryVisible: false,
      storesVisible: true,
      period: "20244",
      center: [126.9238, 37.5562],
    });
  });

  it("rejects unsupported coordinates and invalid filters", () => {
    window.history.replaceState(
      {},
      "",
      "/?market=서울&category=꽃집&radius=250&layer=unknown&lng=127.1&lat=37.4",
    );

    expect(readAnalysisUrlState(defaults, policy)).toEqual(defaults);
  });

  it("falls back when an old 1km URL is opened", () => {
    window.history.replaceState({}, "", "/?radius=1000");

    expect(readAnalysisUrlState(defaults, policy).radius).toBe(300);
  });

  it("writes one shared state to the URL", () => {
    writeAnalysisUrlState({
      marketKey: "합정",
      category: "편의점",
      selectedCategoryName: "꽃집",
      selectedCategoryCode: "G21501",
      radius: 500,
      layer: "density",
      scope: "radius",
      topic: "competition",
      boundaryVisible: true,
      storesVisible: false,
      period: "20251",
      center: [126.914, 37.5505],
    });

    expect(Object.fromEntries(new URLSearchParams(window.location.search))).toEqual({
      market: "합정",
      category: "편의점",
      selectedCategory: "꽃집",
      categoryCode: "G21501",
      radius: "500",
      layer: "density",
      scope: "radius",
      topic: "competition",
      boundary: "1",
      stores: "0",
      period: "20251",
      lng: "126.914000",
      lat: "37.550500",
    });
  });
});
