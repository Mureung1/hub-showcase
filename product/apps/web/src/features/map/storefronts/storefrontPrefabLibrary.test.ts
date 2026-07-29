import * as THREE from "three";
import { describe, expect, it, vi } from "vitest";

import { disposeStorefront } from "./createStorefront";
import { instantiateStorefrontPrefab, storefrontPrefabCount } from "./storefrontPrefabLibrary";
import { getStorefrontVariant } from "./storefrontRegistry";

describe("storefrontPrefabLibrary", () => {
  it("reuses geometry and material resources across instances", () => {
    const variant = getStorefrontVariant("I21201");
    const first = instantiateStorefrontPrefab(variant);
    const second = instantiateStorefrontPrefab(variant);
    const firstCup = first?.getObjectByName("cafe-roof-cup") as THREE.Mesh | undefined;
    const secondCup = second?.getObjectByName("cafe-roof-cup") as THREE.Mesh | undefined;

    expect(firstCup).toBeDefined();
    expect(secondCup).toBeDefined();
    expect(first).not.toBe(second);
    expect(firstCup?.geometry).toBe(secondCup?.geometry);
    expect(firstCup?.material).toBe(secondCup?.material);
    expect(storefrontPrefabCount()).toBeGreaterThan(0);

    if (first && firstCup) {
      const disposeGeometry = vi.spyOn(firstCup.geometry, "dispose");
      disposeStorefront(first);
      expect(disposeGeometry).not.toHaveBeenCalled();
    }
  });
});
