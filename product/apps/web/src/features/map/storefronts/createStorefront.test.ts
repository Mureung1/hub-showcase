import { describe, expect, it } from "vitest";

import { createStorefront, disposeStorefront } from "./createStorefront";
import { getStorefrontVariant } from "./storefrontRegistry";

describe("storefront prototype", () => {
  it("builds a flower shop from the category registry", () => {
    const storefront = createStorefront(getStorefrontVariant("CS300028"));

    expect(storefront.name).toBe("storefront-CS300028");
    expect(storefront.userData.label).toBe("LocalTwin Flower");
    expect(storefront.getObjectByName("shop-body")).toBeDefined();
    expect(storefront.getObjectByName("storefront-sign")).toBeDefined();
    expect(storefront.getObjectsByProperty("name", "flower-attachment")).toHaveLength(7);

    disposeStorefront(storefront);
  });

  it("uses the generic variant for an unmapped category", () => {
    const storefront = createStorefront(getStorefrontVariant("I21201"));

    expect(storefront.userData.categoryCode).toBe("generic");
    expect(storefront.getObjectsByProperty("name", "flower-attachment")).toHaveLength(0);
    disposeStorefront(storefront);
  });
});
