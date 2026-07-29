import { afterEach, describe, expect, it } from "vitest";

import { readAnalysisUrlState } from "./analysisUrlState";

const defaults = {
  marketKey: "연남" as const,
  category: "카페" as const,
  selectedCategoryName: "카페",
  selectedCategoryCode: null,
  radius: 300 as const,
  activeHour: 2,
  layer: "density" as const,
  scope: "market" as const,
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
      "/?market=홍대&category=음식점&selectedCategory=한식%20음식점업&categoryCode=I20101&radius=500&hour=4&layer=demand&scope=market&topic=flow&boundary=0&stores=1&period=20244&lng=126.9238&lat=37.5562",
    );

    expect(readAnalysisUrlState(defaults, policy)).toEqual({
      marketKey: "홍대",
      category: "음식점",
      selectedCategoryName: "한식 음식점업",
      selectedCategoryCode: "I20101",
      radius: 500,
      activeHour: 4,
      layer: "demand",
      scope: "market",
      topic: "flow",
      boundaryVisible: false,
      storesVisible: true,
      period: "20244",
      center: [126.9238, 37.5562],
    });
  });

  it("restores a partial catalog category even when the analysis category remains 카페", () => {
    window.history.replaceState(
      {},
      "",
      "/?market=연남&category=카페&selectedCategory=체육&radius=300&hour=1&layer=density&topic=competition&boundary=1&stores=1&period=20254&lng=126.922788&lat=37.563496",
    );

    const restored = readAnalysisUrlState(defaults, policy);
    expect(restored.category).toBe("카페");
    expect(restored.selectedCategoryName).toBe("체육");
    expect(restored.activeHour).toBe(1);
  });

  it("rejects unsupported coordinates and invalid filters", () => {
    window.history.replaceState(
      {},
      "",
      "/?market=서울&category=꽃집&radius=250&hour=9&layer=unknown&lng=127.1&lat=37.4",
    );

    expect(readAnalysisUrlState(defaults, policy)).toEqual(defaults);
  });

  it("falls back when an old 1km URL is opened", () => {
    window.history.replaceState({}, "", "/?radius=1000");

    expect(readAnalysisUrlState(defaults, policy).radius).toBe(300);
  });
});
