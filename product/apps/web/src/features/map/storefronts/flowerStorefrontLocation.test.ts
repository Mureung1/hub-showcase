import { describe, expect, it } from "vitest";

import { flowerStorefrontLocation } from "./flowerStorefrontLocation";

describe("flower storefront map location", () => {
  it("uses a canonical flower shop inside the Yeonnam market polygon", () => {
    expect(flowerStorefrontLocation.sourceId).toBe("MA010120220805312100");
    expect(flowerStorefrontLocation.sourceCategory).toBe("꽃집");
    expect(flowerStorefrontLocation.sourceCategoryCode).toBe("G21901");
    expect(flowerStorefrontLocation.visualCategoryCode).toBe("G21901");
    expect(flowerStorefrontLocation.longitude).toBeGreaterThan(126.92);
    expect(flowerStorefrontLocation.longitude).toBeLessThan(126.94);
    expect(flowerStorefrontLocation.latitude).toBeGreaterThan(37.55);
    expect(flowerStorefrontLocation.latitude).toBeLessThan(37.57);
  });
});
