import * as THREE from "three";
import { describe, expect, it, vi } from "vitest";

import { createStorefrontAssetCache, storefrontAssetManifest } from "./storefrontAssets";
import { getStorefrontVariant } from "./storefrontRegistry";

describe("storefront asset cache", () => {
  it("loads shared assets once and clones instances per category", async () => {
    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const material = new THREE.MeshBasicMaterial();
    const source = new THREE.Group();
    source.add(new THREE.Mesh(geometry, material));
    const loadBody = vi.fn().mockResolvedValue(source);
    const loadAtlas = vi.fn().mockResolvedValue(new THREE.Texture());
    const cache = createStorefrontAssetCache({ loadBody, loadAtlas });

    const cafe = await cache.load(getStorefrontVariant("I21201"));
    const bakery = await cache.load(getStorefrontVariant("I21001"));

    expect(loadBody).toHaveBeenCalledTimes(1);
    expect(loadAtlas).toHaveBeenCalledTimes(1);
    expect(cafe.body).not.toBe(bakery.body);
    expect((cafe.body.children[0] as THREE.Mesh).geometry).toBe(geometry);
    expect((bakery.body.children[0] as THREE.Mesh).geometry).toBe(geometry);
    expect(cafe.categoryDecal.offset.x).toBeCloseTo(0.2);
    expect(bakery.categoryDecal.offset.x).toBeCloseTo(0.6);
  });

  it("publishes the generated asset size contract", () => {
    expect(storefrontAssetManifest.bodyBytes).toBeLessThan(30_000);
    expect(storefrontAssetManifest.atlasBytes).toBeLessThan(2_000);
  });

  it("allows a retry after a shared asset load failure", async () => {
    const loadBody = vi
      .fn<() => Promise<THREE.Group>>()
      .mockRejectedValueOnce(new Error("temporary failure"))
      .mockResolvedValueOnce(new THREE.Group());
    const loadAtlas = vi.fn().mockResolvedValue(new THREE.Texture());
    const cache = createStorefrontAssetCache({ loadBody, loadAtlas });

    await expect(cache.load(getStorefrontVariant("I21201"))).rejects.toThrow("temporary failure");
    await expect(cache.load(getStorefrontVariant("I21201"))).resolves.toBeDefined();
    expect(loadBody).toHaveBeenCalledTimes(2);
  });
});
