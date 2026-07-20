import { describe, expect, it } from "vitest";

import { regionLayerIds, regionSourceId } from "./regionLayerIds";
import {
  findReadyOverlayRegion,
  READY_OVERLAY_REGIONS,
  SUPPORTED_REGIONS,
} from "./supportedRegions";

describe("supported map regions", () => {
  it("renders only regions with verified overlay inputs", () => {
    expect(READY_OVERLAY_REGIONS.map((region) => region.id)).toEqual([
      "yeonnam",
      "hongdae",
      "hapjeong",
    ]);

    for (const region of READY_OVERLAY_REGIONS) {
      expect(region.overlayDataUrl).toBe(`/map/${region.id}.geojson`);
      expect(region.overlayRadiusMeters).toBe(720);
      expect(region.center).toHaveLength(2);
    }
  });

  it("keeps Gwanpyeong planned until map evidence exists", () => {
    const gwanpyeong = SUPPORTED_REGIONS.find((region) => region.id === "gwanpyeong");

    expect(gwanpyeong).toEqual({
      id: "gwanpyeong",
      label: "관평동",
      availability: "planned",
      capabilities: ["scene"],
    });
  });

  it("uses globally unique source and layer identifiers", () => {
    const sourceIds = READY_OVERLAY_REGIONS.map((region) => regionSourceId(region.id));
    const layerIds = READY_OVERLAY_REGIONS.flatMap((region) => regionLayerIds(region.id));

    expect(new Set(sourceIds).size).toBe(sourceIds.length);
    expect(new Set(layerIds).size).toBe(layerIds.length);
  });

  it("distinguishes supported centers from base-map-only locations", () => {
    expect(findReadyOverlayRegion([126.9257, 37.5661])?.id).toBe("yeonnam");
    expect(findReadyOverlayRegion([127.105, 37.401])).toBeUndefined();
  });
});
