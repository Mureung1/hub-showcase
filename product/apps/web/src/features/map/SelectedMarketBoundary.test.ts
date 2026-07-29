import { describe, expect, it } from "vitest";

import { marketBoundaryFilter } from "./marketBoundary";

describe("selected market boundary", () => {
  it("filters the canonical boundary by stable market id", () => {
    expect(marketBoundaryFilter("3120103")).toEqual([
      "==",
      ["get", "market_id"],
      "3120103",
    ]);
  });

  it("falls back to the stable market key when one is available", () => {
    expect(marketBoundaryFilter("remote-id", "홍대")).toEqual([
      "any",
      ["==", ["get", "market_id"], "remote-id"],
      ["==", ["get", "market_key"], "홍대"],
    ]);
  });
});
