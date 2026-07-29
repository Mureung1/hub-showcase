import * as THREE from "three";
import { describe, expect, it, vi } from "vitest";

import {
  createStorefront,
  createStorefrontCategoryMarker,
  disposeStorefront,
} from "./createStorefront";
import {
  getStorefrontVariant,
  hasStorefrontVariant,
  storefrontVisualStatus,
} from "./storefrontRegistry";

describe("storefront prototype", () => {
  it("builds a flower shop from the category registry", () => {
    const storefront = createStorefront(getStorefrontVariant("G21901"));

    expect(storefront.name).toBe("storefront-G21901");
    expect(storefront.userData.label).toBe("LocalTwin Flower");
    expect(storefront.getObjectByName("shop-body")).toBeDefined();
    expect(storefront.getObjectByName("storefront-sign")).toBeDefined();
    expect(storefront.getObjectByName("design-marker-flower")).toBeDefined();
    expect(storefront.getObjectByName("design-flower")).toBeDefined();

    disposeStorefront(storefront);
  });

  it.each([
    ["I21201", "LocalTwin Cafe", "design-marker-cafe"],
    ["I20101", "LocalTwin Restaurant", "design-marker-restaurant"],
    ["I21001", "LocalTwin Bakery", "design-marker-bakery"],
    ["G20405", "LocalTwin Convenience", "design-marker-convenience"],
    ["S20701", "LocalTwin Beauty", "design-marker-beauty"],
    ["G20901", "LocalTwin Apparel", "design-marker-apparel"],
    ["P10501", "LocalTwin Academy", "design-marker-academy"],
    ["I10103", "LocalTwin Lodging", "design-marker-lodging"],
    ["S20801", "LocalTwin Sports", "design-marker-sports"],
    ["P10603", "LocalTwin Sports", "design-marker-sports"],
  ])("builds the reviewed %s category attachment", (code, label, objectName) => {
    const storefront = createStorefront(getStorefrontVariant(code));

    expect(storefront.userData.categoryCode).toBe(code);
    expect(storefront.userData.label).toBe(label);
    expect(storefront.getObjectByName("category-attachment")).toBeDefined();
    expect(storefront.getObjectByName(objectName)).toBeDefined();
    disposeStorefront(storefront);
  });

  it.each([
    ["I21201", "design-marker-cafe"],
    ["I20101", "design-marker-restaurant"],
    ["I21001", "design-marker-bakery"],
    ["G20405", "design-marker-convenience"],
    ["S20701", "design-marker-beauty"],
    ["S20801", "design-marker-sports"],
  ])("builds a standalone rooftop marker for %s", (code, objectName) => {
    const marker = createStorefrontCategoryMarker(getStorefrontVariant(code));

    expect(marker.name).toBe(`storefront-category-marker-${code}`);
    expect(marker.userData.assetStrategy).toBe("reviewed-storefront-model");
    expect(marker.getObjectByName("shop-body")).toBeUndefined();
    expect(marker.getObjectByName("storefront-square-plot")).toBeDefined();
    expect(marker.getObjectByName(objectName)).toBeDefined();
    disposeStorefront(marker);
  });

  it("uses the reviewed flower marker and no legacy generic service object", () => {
    const flowerMarker = createStorefrontCategoryMarker(getStorefrontVariant("G21901"));
    const serviceMarker = createStorefrontCategoryMarker(
      getStorefrontVariant("unknown-category-code"),
    );

    expect(flowerMarker.getObjectByName("design-marker-flower")).toBeDefined();
    expect(serviceMarker.getObjectByName("category-attachment")).toBeUndefined();
    expect(serviceMarker.getObjectByName("service-marker-sign")).toBeUndefined();
    disposeStorefront(flowerMarker);
    disposeStorefront(serviceMarker);
  });

  it("recognizes exact and restaurant-family canonical codes", () => {
    expect(hasStorefrontVariant("G21901")).toBe(true);
    expect(hasStorefrontVariant("I21201")).toBe(true);
    expect(hasStorefrontVariant("I20107")).toBe(true);
    expect(hasStorefrontVariant("S20701")).toBe(true);
    expect(hasStorefrontVariant("unknown-category-code")).toBe(false);
  });

  it("creates a neutral service storefront for an unmapped category", () => {
    const storefront = createStorefront(getStorefrontVariant("unknown-category-code"));

    expect(storefront.userData.categoryCode).toBe("unknown-category-code");
    expect(storefront.getObjectsByProperty("name", "flower-attachment")).toHaveLength(0);
    disposeStorefront(storefront);
  });

  it("keeps unreviewed commercial codes on the original gray building", () => {
    expect(storefrontVisualStatus("Q10101")).toBe("generic");
    expect(storefrontVisualStatus("I20107")).toBe("mapped");
  });

  it("combines a shared GLB body with four direction-neutral atlas decals", () => {
    const body = new THREE.Group();
    const sharedGeometry = new THREE.BoxGeometry(1, 1, 1);
    const geometryDispose = vi.spyOn(sharedGeometry, "dispose");
    const bodyMesh = new THREE.Mesh(sharedGeometry, new THREE.MeshBasicMaterial());
    bodyMesh.name = "shop-body";
    bodyMesh.userData.sharedGeometry = true;
    body.add(bodyMesh);
    const categoryDecal = new THREE.Texture();
    const textureDispose = vi.spyOn(categoryDecal, "dispose");

    const storefront = createStorefront(getStorefrontVariant("I21201"), {
      body,
      categoryDecal,
    });

    expect(storefront.userData.assetStrategy).toBe("shared-glb-body-category-atlas");
    expect(storefront.getObjectByName("shared-glb-body")).toBeDefined();
    expect(storefront.getObjectsByProperty("name", "category-decal-front")).toHaveLength(1);
    expect(storefront.getObjectByName("category-decal-back")).toBeDefined();
    expect(storefront.getObjectByName("category-decal-left")).toBeDefined();
    expect(storefront.getObjectByName("category-decal-right")).toBeDefined();

    disposeStorefront(storefront);
    expect(geometryDispose).not.toHaveBeenCalled();
    expect(textureDispose).toHaveBeenCalledTimes(1);
  });
});
