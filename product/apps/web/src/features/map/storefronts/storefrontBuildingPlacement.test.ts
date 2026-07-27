import { describe, expect, it } from "vitest";

import { countStoresInBuilding, findStorefrontBuilding } from "./storefrontBuildingPlacement";

const overlay = {
  features: [
    {
      properties: { layer: "building", osm_id: "way/one", height: 12 },
      geometry: {
        type: "Polygon" as const,
        coordinates: [
          [
            [126.92, 37.55],
            [126.9201, 37.55],
            [126.9201, 37.5501],
            [126.92, 37.5501],
            [126.92, 37.55],
          ],
        ],
      },
    },
  ],
};

function pointInRing([longitude, latitude]: [number, number], ring: number[][]) {
  let inside = false;
  for (let index = 0, previous = ring.length - 1; index < ring.length; previous = index++) {
    const [currentLongitude, currentLatitude] = ring[index];
    const [previousLongitude, previousLatitude] = ring[previous];
    const crosses =
      currentLatitude > latitude !== previousLatitude > latitude &&
      longitude <
        ((previousLongitude - currentLongitude) * (latitude - currentLatitude)) /
          (previousLatitude - currentLatitude) +
          currentLongitude;
    if (crosses) inside = !inside;
  }
  return inside;
}

describe("storefront building placement", () => {
  it("links a store coordinate to its local overlay building", () => {
    const placement = findStorefrontBuilding(overlay, [126.92005, 37.55005]);

    expect(placement).toMatchObject({ buildingId: "way/one", heightMeters: 12 });
    expect(placement?.plotSizeMeters).toBeGreaterThan(2.8);
    expect(placement?.plotSizeMeters).toBeLessThan(15);
  });

  it("does not replace a building when more than one known store is inside it", () => {
    expect(
      countStoresInBuilding(overlay, "way/one", [
        { id: "a", longitude: 126.92003, latitude: 37.55003 },
        { id: "b", longitude: 126.92008, latitude: 37.55008 },
        { id: "outside", longitude: 126.921, latitude: 37.551 },
      ]),
    ).toBe(2);
  });

  it("keeps every square plot corner inside the source building footprint", () => {
    const placement = findStorefrontBuilding(overlay, [126.92005, 37.55005]);
    expect(placement).not.toBeNull();
    const half = placement!.plotSizeMeters / 2;
    const metersPerLatitude = 111_320;
    const metersPerLongitude = metersPerLatitude * Math.cos((placement!.center[1] * Math.PI) / 180);
    const corners: Array<[number, number]> = [
      [-half, -half],
      [half, -half],
      [half, half],
      [-half, half],
    ].map(
      ([x, y]) =>
        [
          placement!.center[0] + x / metersPerLongitude,
          placement!.center[1] + y / metersPerLatitude,
        ] as [number, number],
    );
    const ring = overlay.features[0].geometry.coordinates[0];

    expect(corners.every((corner) => pointInRing(corner, ring))).toBe(true);
  });
});
