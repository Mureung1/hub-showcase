import { describe, expect, it } from "vitest";

import { analysisCategoryFor } from "./categoryMapping";

describe("analysisCategoryFor", () => {
  it("maps only supported source categories to the analysis filter", () => {
    expect(analysisCategoryFor("카페")).toBe("카페");
    expect(analysisCategoryFor("편의점")).toBe("편의점");
    expect(analysisCategoryFor("제과점")).toBe("베이커리");
    expect(analysisCategoryFor("한식 음식점업")).toBe("음식점");
    expect(analysisCategoryFor("백반/한정식", "I20101")).toBe("음식점");
    expect(analysisCategoryFor("빵/도넛", "I21001")).toBe("베이커리");
    expect(analysisCategoryFor("점포", "I21201")).toBe("카페");
    expect(analysisCategoryFor("점포", "G20405")).toBe("편의점");
    expect(analysisCategoryFor("꽃집")).toBeNull();
  });
});
