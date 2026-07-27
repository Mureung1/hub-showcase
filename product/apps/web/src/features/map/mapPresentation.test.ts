import { describe, expect, it } from "vitest";

import { getMapPresentationProfile } from "./mapPresentation";

describe("map presentation profiles", () => {
  it("keeps the flat map free of every 3D building source", () => {
    expect(getMapPresentationProfile("flat")).toEqual({
      camera: { pitch: 0, bearing: 0 },
      localTwinOverlayVisible: false,
      coloredBuildingsVisible: false,
      fallbackBuildingsVisible: false,
      storefrontsVisible: false,
    });
  });

  it("shows colored buildings without storefront replacements in analysis mode", () => {
    const profile = getMapPresentationProfile("analysis");

    expect(profile.coloredBuildingsVisible).toBe(true);
    expect(profile.storefrontsVisible).toBe(false);
    expect(profile.camera).toEqual({ pitch: 38, bearing: -18 });
  });

  it("enables storefront replacement only in storefront mode", () => {
    const profile = getMapPresentationProfile("storefront3d");

    expect(profile.coloredBuildingsVisible).toBe(true);
    expect(profile.storefrontsVisible).toBe(true);
    expect(profile.camera).toEqual({ pitch: 56, bearing: -24 });
  });
});
