import { describe, expect, it } from "vitest";

import { replacementFootprintsFilter } from "./replacementBuildingFilter";

const polygon = {
  type: "Polygon" as const,
  coordinates: [
    [
      [126.9, 37.5] as [number, number],
      [126.901, 37.5] as [number, number],
      [126.901, 37.501] as [number, number],
      [126.9, 37.501] as [number, number],
      [126.9, 37.5] as [number, number],
    ],
  ],
};

describe("replacement building filter", () => {
  it("leaves the base building layer unfiltered when no storefront is ready", () => {
    expect(replacementFootprintsFilter([])).toBeUndefined();
  });

  it("excludes only buildings contained by ready storefront footprints", () => {
    expect(replacementFootprintsFilter([polygon])).toEqual([
      "!",
      [
        "within",
        {
          type: "MultiPolygon",
          coordinates: [polygon.coordinates],
        },
      ],
    ]);
  });
});
