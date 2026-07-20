import { describe, expect, it } from "vitest";

import {
  categoryMatchesSelection,
  quickCategorySelection,
  storeCategorySelection,
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
});
