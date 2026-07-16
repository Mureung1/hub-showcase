import { describe, expect, it } from "vitest";

import { shouldShowBaseBuildings } from "./baseMap";

describe("base map building visibility", () => {
  it("avoids overlapping base and LocalTwin building extrusions", () => {
    expect(shouldShowBaseBuildings(true, "localtwin", true)).toBe(false);
    expect(shouldShowBaseBuildings(true, "localtwin", false)).toBe(true);
    expect(shouldShowBaseBuildings(true, "original", true)).toBe(true);
    expect(shouldShowBaseBuildings(false, "original", false)).toBe(false);
  });
});
