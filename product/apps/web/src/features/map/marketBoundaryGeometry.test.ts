import { describe, expect, it } from "vitest";

import {
  findMarketBoundaryGeometry,
  outsideSelectedMarketFilter,
  selectedMarketBuildingFilter,
  type MarketBoundaryGeometry,
} from "./marketBoundaryGeometry";

const geometry: MarketBoundaryGeometry = {
  type: "Polygon",
  coordinates: [
    [
      [126.92, 37.56],
      [126.93, 37.56],
      [126.93, 37.57],
      [126.92, 37.57],
      [126.92, 37.56],
    ],
  ],
};

describe("selected market geometry", () => {
  it("finds the official polygon by market id", () => {
    expect(
      findMarketBoundaryGeometry(
        {
          features: [
            { properties: { market_id: "other" }, geometry: null },
            { properties: { market_id: "3110562" }, geometry },
          ],
        },
        "3110562",
      ),
    ).toEqual(geometry);
  });

  it("keeps OpenMapTiles buildings only outside the selected market", () => {
    expect(outsideSelectedMarketFilter(geometry)).toEqual([
      ">",
      ["distance", geometry],
      0.75,
    ]);
  });

  it("shows LocalTwin buildings inside the market and excludes exact replacement ids", () => {
    expect(selectedMarketBuildingFilter(geometry, ["way/one"])).toEqual([
      "all",
      ["==", ["get", "layer"], "building"],
      ["<=", ["distance", geometry], 0.75],
      ["!", ["in", ["get", "osm_id"], ["literal", ["way/one"]]]],
    ]);
  });
});
