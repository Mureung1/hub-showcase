import { describe, expect, it } from "vitest";

import { getMapPresentationProfile } from "./mapPresentation";

describe("map presentation profiles", () => {
  it("keeps the flat map free of every 3D building source", () => {
    expect(getMapPresentationProfile("flat")).toEqual({
      camera: { pitch: 0, bearing: 0 },
      localTwinOverlayVisible: false,
      selectedMarketBuildingsVisible: false,
      fallbackBuildingsVisible: false,
      storefrontsVisible: false,
    });
  });

  it("shows selected-market buildings without storefront replacements in analysis mode", () => {
    const profile = getMapPresentationProfile("analysis");

    expect(profile.selectedMarketBuildingsVisible).toBe(true);
    expect(profile.fallbackBuildingsVisible).toBe(true);
    expect(profile.storefrontsVisible).toBe(false);
    expect(profile.camera).toEqual({ pitch: 38, bearing: -18 });
  });

  it("keeps selected-market buildings and enables storefront replacement only in storefront mode", () => {
    const profile = getMapPresentationProfile("storefront3d");

    expect(profile.selectedMarketBuildingsVisible).toBe(true);
    expect(profile.fallbackBuildingsVisible).toBe(true);
    expect(profile.storefrontsVisible).toBe(true);
    expect(profile.camera).toEqual({ pitch: 56, bearing: -24 });
  });
});
