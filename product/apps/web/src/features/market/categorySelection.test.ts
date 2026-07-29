import { describe, expect, it } from "vitest";

import {
  categoryMatchesSelection,
  quickCategorySelection,
  storeCategorySelection,
  topCategorySelectionForStore,
} from "./categorySelection";

describe("category selection", () => {
  it("marks an explicit product category as fully supported", () => {
    expect(quickCategorySelection("카페")).toEqual({
      name: "카페",
      code: null,
      analysisCategory: "카페",
      coverage: "full",
    });
  });

  it("keeps a selected store under its top-level category filter", () => {
    expect(topCategorySelectionForStore("미용실", "S20701")).toMatchObject({
      name: "미용",
      coverage: "partial",
    });
    expect(topCategorySelectionForStore("요가·필라테스", "P10603")).toMatchObject({
      name: "체육",
      coverage: "partial",
    });
    expect(topCategorySelectionForStore("펜션", "I10103")).toMatchObject({
      name: "숙박",
      coverage: "partial",
    });
  });

  it("keeps a store's original detailed category without claiming full coverage", () => {
    expect(storeCategorySelection("한식 음식점업", "I20101")).toEqual({
      name: "한식 음식점업",
      code: "I20101",
      analysisCategory: "음식점",
      coverage: "partial",
    });
    expect(storeCategorySelection("꽃집", "G21501")).toEqual({
      name: "꽃집",
      code: "G21501",
      analysisCategory: null,
      coverage: "partial",
    });
  });

  it("matches exact detailed categories and broad full-support categories separately", () => {
    expect(categoryMatchesSelection("꽃집", storeCategorySelection("꽃집"))).toBe(true);
    expect(categoryMatchesSelection("한식 음식점업", quickCategorySelection("음식점"))).toBe(true);
    expect(categoryMatchesSelection("중식", storeCategorySelection("한식 음식점업"))).toBe(false);
  });

  it("keeps top-category aliases returned by the API visible", () => {
    expect(categoryMatchesSelection("네일샵", quickCategorySelection("미용"))).toBe(true);
    expect(categoryMatchesSelection("피트니스센터", quickCategorySelection("체육"))).toBe(true);
    expect(categoryMatchesSelection("펜션", quickCategorySelection("숙박"), "I10103")).toBe(true);
  });
});
