import { describe, expect, it } from "vitest";

import {
  findMarketBoundaryGeometry,
  insideSelectedMarketFilter,
  outsideSelectedMarketFilter,
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
            { properties: { market_id: "3110562", market_key: "연남" }, geometry },
          ],
        },
        "3110562",
        "연남",
      ),
    ).toEqual(geometry);
  });

  it("falls back to the stable market key when catalog ids differ", () => {
    expect(
      findMarketBoundaryGeometry(
        {
          features: [
            { properties: { market_id: "3120103", market_key: "홍대" }, geometry },
          ],
        },
        "remote-id-changed",
        "홍대",
      ),
    ).toEqual(geometry);
  });

  it("splits one building source into complementary outside and inside layers", () => {
    expect(outsideSelectedMarketFilter(geometry)).toEqual([
      ">",
      ["distance", geometry],
      0.75,
    ]);
    expect(insideSelectedMarketFilter(geometry)).toEqual([
      "<=",
      ["distance", geometry],
      0.75,
    ]);
  });

  it("keeps all buildings gray until the boundary is ready", () => {
    expect(outsideSelectedMarketFilter(null)).toEqual(["all"]);
    expect(insideSelectedMarketFilter(null)).toEqual(["==", 1, 0]);
  });
});
