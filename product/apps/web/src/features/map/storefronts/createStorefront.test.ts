import * as THREE from "three";
import { describe, expect, it, vi } from "vitest";

import {
  createStorefront,
  createStorefrontCategoryMarker,
  disposeStorefront,
} from "./createStorefront";
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
    ["S20701", "LocalTwin Beauty", "beauty-mirror"],
    ["G20901", "LocalTwin Apparel", "apparel-rack-bar"],
    ["P10501", "LocalTwin Academy", "academy-book"],
    ["I10103", "LocalTwin Lodging", "lodging-bed-base"],
    ["S20801", "LocalTwin Sports", "sports-dumbbell-handle"],
  ])("builds a direction-neutral %s category attachment", (code, label, objectName) => {
    const storefront = createStorefront(getStorefrontVariant(code));

    expect(storefront.userData.categoryCode).toBe(code);
    expect(storefront.userData.label).toBe(label);
    expect(storefront.getObjectByName("category-attachment")).toBeDefined();
    expect(storefront.getObjectByName(objectName)).toBeDefined();
    disposeStorefront(storefront);
  });

  it.each([
    ["I21201", "coffee-cup"],
    ["I20101", "meal-bowl"],
    ["I21001", "bakery-loaf"],
    ["G20405", "convenience-sign"],
    ["S20801", "sports-dumbbell-handle"],
  ])("builds a standalone rooftop marker for %s", (code, objectName) => {
    const marker = createStorefrontCategoryMarker(getStorefrontVariant(code));

    expect(marker.name).toBe(`storefront-category-marker-${code}`);
    expect(marker.userData.assetStrategy).toBe("procedural-rooftop-category-marker");
    expect(marker.getObjectByName("shop-body")).toBeUndefined();
    expect(marker.getObjectByName("category-marker-pedestal")).toBeDefined();
    expect(marker.getObjectByName(objectName)).toBeDefined();
    disposeStorefront(marker);
  });

  it("creates visible rooftop markers for flower and generic service categories", () => {
    const flowerMarker = createStorefrontCategoryMarker(getStorefrontVariant("G21901"));
    const serviceMarker = createStorefrontCategoryMarker(
      getStorefrontVariant("unknown-category-code"),
    );

    expect(flowerMarker.getObjectByName("category-attachment")).toBeDefined();
    expect(flowerMarker.getObjectsByProperty("name", "flower-attachment")).toHaveLength(3);
    expect(serviceMarker.getObjectByName("service-marker-sign")).toBeDefined();
    disposeStorefront(flowerMarker);
    disposeStorefront(serviceMarker);
  });

  it("recognizes exact and restaurant-family canonical codes", () => {
    expect(hasStorefrontVariant("G21901")).toBe(true);
    expect(hasStorefrontVariant("I21201")).toBe(true);
    expect(hasStorefrontVariant("I20107")).toBe(true);
    expect(hasStorefrontVariant("S20701")).toBe(true);
    expect(hasStorefrontVariant("unknown-category-code")).toBe(true);
  });

  it("creates a neutral service storefront for an unmapped category", () => {
    const storefront = createStorefront(getStorefrontVariant("unknown-category-code"));

    expect(storefront.userData.categoryCode).toBe("unknown-category-code");
    expect(storefront.getObjectsByProperty("name", "flower-attachment")).toHaveLength(0);
    disposeStorefront(storefront);
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
