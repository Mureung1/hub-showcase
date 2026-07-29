import { describe, expect, it } from "vitest";

import type { ProductCatalog } from "../../services/productCatalog";
import type { AnalysisInitialState } from "./useAnalysisSelection";
import {
  ANALYSIS_SESSION_STORAGE_KEY,
  restoreAnalysisSessionState,
  saveAnalysisSessionState,
} from "./analysisSessionState";

const catalog: ProductCatalog = {
  markets: [
    {
      key: "연남",
      market_id: "3110562",
      name: "연남동 골목상권",
      address: "연남",
      center: [126.9227, 37.5628],
    },
    {
      key: "합정",
      market_id: "3120101",
      name: "합정역 상권",
      address: "합정",
      center: [126.9139, 37.5486],
    },
  ],
  categories: [{ name: "카페", codes: [] }],
  radii: [100, 300, 500],
};

const initial: AnalysisInitialState = {
  marketKey: "연남",
  category: "카페",
  selectedCategoryName: "카페",
  selectedCategoryCode: null,
  radius: 300,
  activeHour: 2,
  layer: "density",
  scope: "market",
  topic: "overview",
  boundaryVisible: true,
  storesVisible: true,
  period: "",
  center: [126.9227, 37.5628],
};

function memoryStorage(seed?: string) {
  let value = seed ?? null;
  return {
    getItem: () => value,
    setItem: (_key: string, next: string) => {
      value = next;
    },
  };
}

describe("analysis session state", () => {
  it("restores valid filters and the matching market center without using the URL", () => {
    const storage = memoryStorage();
    saveAnalysisSessionState(
      {
        marketKey: "합정",
        selectedCategoryName: "미용",
        selectedCategoryCode: "S20701",
        radius: 500,
        activeHour: 4,
        layer: "demand",
        topic: "flow",
        boundaryVisible: false,
        storesVisible: false,
        period: "20254",
      },
      storage,
    );

    expect(restoreAnalysisSessionState(initial, catalog, storage)).toMatchObject({
      marketKey: "합정",
      center: [126.9139, 37.5486],
      category: "미용",
      selectedCategoryName: "미용",
      selectedCategoryCode: "S20701",
      radius: 500,
      activeHour: 4,
      layer: "demand",
      topic: "flow",
      boundaryVisible: false,
      storesVisible: false,
      period: "20254",
    });
  });

  it("falls back safely when a cached value no longer matches the supported catalog", () => {
    const storage = memoryStorage(
      JSON.stringify({
        marketKey: "없는 상권",
        selectedCategoryName: "카페",
        radius: 700,
        activeHour: 9,
        layer: "unknown",
        topic: "unknown",
      }),
    );

    expect(restoreAnalysisSessionState(initial, catalog, storage)).toMatchObject(initial);
  });

  it("ignores malformed cached JSON", () => {
    const storage = memoryStorage("not-json");

    expect(restoreAnalysisSessionState(initial, catalog, storage)).toEqual(initial);
    expect(ANALYSIS_SESSION_STORAGE_KEY).toBe("localtwin.analysis-selection.v1");
  });
});
