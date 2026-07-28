import { describe, expect, it } from "vitest";

import type { SelectedStorefront } from "./SelectedStorefrontLayer";
import {
  replacementBuildingBaseExpression,
  replacementBuildingHeightExpression,
} from "./replacementBuildingFilter";

const readyStorefront: SelectedStorefront = {
  id: "store-a",
  longitude: 126.9,
  latitude: 37.5,
  categoryCode: "I21201",
  building: {
    id: "building-a",
    center: [126.9001, 37.5001],
    plotSizeMeters: 8,
    heightMeters: 7,
    storeCountInBuilding: 1,
  },
};

describe("replacement building paint expressions", () => {
  it("keeps the original building dimensions when no storefront is ready", () => {
    expect(replacementBuildingBaseExpression([])).toEqual([
      "to-number",
      ["get", "render_min_height"],
      0,
    ]);
    expect(replacementBuildingHeightExpression([])).toEqual([
      "to-number",
      ["get", "render_height"],
      8,
    ]);
  });

  it("collapses only buildings touching a ready storefront center", () => {
    expect(replacementBuildingHeightExpression([readyStorefront])).toEqual([
      "case",
      [
        "<=",
        [
          "distance",
          {
            type: "MultiPoint",
            coordinates: [[126.9001, 37.5001]],
          },
        ],
        0.75,
      ],
      0,
      ["to-number", ["get", "render_height"], 8],
    ]);
    expect(replacementBuildingBaseExpression([readyStorefront])).toEqual([
      "case",
      [
        "<=",
        [
          "distance",
          {
            type: "MultiPoint",
            coordinates: [[126.9001, 37.5001]],
          },
        ],
        0.75,
      ],
      0,
      ["to-number", ["get", "render_min_height"], 0],
    ]);
  });
});
