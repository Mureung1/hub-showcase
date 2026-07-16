import { describe, expect, it } from "vitest";

import { createStorefront, disposeStorefront } from "./createStorefront";
import { getStorefrontVariant, hasStorefrontVariant } from "./storefrontRegistry";

describe("storefront prototype", () => {
  it("builds a flower shop from the category registry", () => {
    const storefront = createStorefront(getStorefrontVariant("G21901"));

    expect(storefront.name).toBe("storefront-G21901");
    expect(storefront.userData.label).toBe("LocalTwin Flower");
    expect(storefront.getObjectByName("shop-body")).toBeDefined();
    expect(storefront.getObjectByName("storefront-sign")).toBeDefined();
    expect(storefront.getObjectsByProperty("name", "flower-attachment")).toHaveLength(7);

    disposeStorefront(storefront);
  });

  it.each([
    ["I21201", "LocalTwin Cafe", "coffee-cup"],
    ["I20101", "LocalTwin Restaurant", "meal-bowl"],
    ["I21001", "LocalTwin Bakery", "bakery-loaf"],
    ["G20405", "LocalTwin Convenience", "convenience-sign"],
  ])("builds a direction-neutral %s category attachment", (code, label, objectName) => {
    const storefront = createStorefront(getStorefrontVariant(code));

    expect(storefront.userData.categoryCode).toBe(code);
    expect(storefront.userData.label).toBe(label);
    expect(storefront.getObjectByName("category-attachment")).toBeDefined();
    expect(storefront.getObjectByName(objectName)).toBeDefined();
    disposeStorefront(storefront);
  });

  it("recognizes exact and restaurant-family canonical codes", () => {
    expect(hasStorefrontVariant("G21901")).toBe(true);
    expect(hasStorefrontVariant("I21201")).toBe(true);
    expect(hasStorefrontVariant("I20107")).toBe(true);
    expect(hasStorefrontVariant("S20701")).toBe(false);
  });

  it("uses the generic variant for an unmapped category", () => {
    const storefront = createStorefront(getStorefrontVariant("S20701"));

    expect(storefront.userData.categoryCode).toBe("generic");
    expect(storefront.getObjectsByProperty("name", "flower-attachment")).toHaveLength(0);
    disposeStorefront(storefront);
  });
});
