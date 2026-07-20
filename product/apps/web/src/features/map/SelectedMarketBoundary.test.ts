import { describe, expect, it } from "vitest";

import { marketBoundaryFilter } from "./marketBoundary";

describe("selected market boundary", () => {
  it("filters the canonical boundary by stable market id", () => {
    expect(marketBoundaryFilter("3120103")).toEqual(["==", "market_id", "3120103"]);
  });
});
