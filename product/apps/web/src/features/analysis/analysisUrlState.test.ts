import { afterEach, describe, expect, it } from "vitest";

import { readAnalysisUrlState, writeAnalysisUrlState } from "./analysisUrlState";

const defaults = {
  marketKey: "연남" as const,
  category: "카페" as const,
  radius: 300 as const,
  layer: "density" as const,
  center: [126.922787722224, 37.5634957461626] as [number, number],
};

afterEach(() => window.history.replaceState({}, "", "/"));

describe("analysis URL state", () => {
  it("restores supported filter and center values", () => {
    window.history.replaceState(
      {},
      "",
      "/?market=홍대&category=음식점&radius=1000&layer=demand&lng=126.9238&lat=37.5562",
    );

    expect(readAnalysisUrlState(defaults)).toEqual({
      marketKey: "홍대",
      category: "음식점",
      radius: 1000,
      layer: "demand",
      center: [126.9238, 37.5562],
    });
  });

  it("rejects unsupported coordinates and invalid filters", () => {
    window.history.replaceState(
      {},
      "",
      "/?market=서울&category=꽃집&radius=250&layer=unknown&lng=127.1&lat=37.4",
    );

    expect(readAnalysisUrlState(defaults)).toEqual(defaults);
  });

  it("writes one shared state to the URL", () => {
    writeAnalysisUrlState({
      marketKey: "합정",
      category: "편의점",
      radius: 500,
      layer: "density",
      center: [126.914, 37.5505],
    });

    expect(Object.fromEntries(new URLSearchParams(window.location.search))).toEqual({
      market: "합정",
      category: "편의점",
      radius: "500",
      layer: "density",
      lng: "126.914000",
      lat: "37.550500",
    });
  });
});
