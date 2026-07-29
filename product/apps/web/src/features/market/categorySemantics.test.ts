import { describe, expect, it } from "vitest";

import {
  categoryFocusCode,
  categoryGroupLabel,
  categoryTone,
  resolveCategorySemanticGroup,
} from "./categorySemantics";

describe("category semantics", () => {
  it("classifies yoga and Pilates academies as sports before academy", () => {
    expect(resolveCategorySemanticGroup("요가/필라테스 학원")).toBe("sports");
    expect(categoryGroupLabel("요가/필라테스 학원")).toBe("체육");
    expect(categoryTone("요가/필라테스 학원")).toBe("teal");
    expect(categoryFocusCode("요가/필라테스 학원", "P10625")).toBe("S20801");
  });

  it("keeps ordinary education stores in the academy group", () => {
    expect(resolveCategorySemanticGroup("외국어 학원")).toBe("academy");
    expect(categoryGroupLabel("외국어 학원")).toBe("학원");
    expect(categoryFocusCode("외국어 학원", "P10501")).toBe("P10501");
  });
});
