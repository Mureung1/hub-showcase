import { describe, expect, it } from "vitest";

import {
  categoryClass,
  demandFromFlow,
  flowBucketDurationHours,
  flowBucketHourlyAverage,
} from "./model";

describe("category marker classes", () => {
  it("keeps core and extended storefront categories visually distinct", () => {
    expect(categoryClass("카페")).toBe("green");
    expect(categoryClass("한식 음식점")).toBe("orange");
    expect(categoryClass("베이커리")).toBe("blue");
    expect(categoryClass("편의점")).toBe("navy");
    expect(categoryClass("꽃집")).toBe("yellow");
    expect(categoryClass("미용실")).toBe("pink");
    expect(categoryClass("체육시설")).toBe("red");
  });
});

describe("flow bucket normalization", () => {
  it("reads the source bucket durations from their labels", () => {
    expect(flowBucketDurationHours("00:00-06:00")).toBe(6);
    expect(flowBucketDurationHours("11:00-14:00")).toBe(3);
    expect(flowBucketDurationHours("17:00-21:00")).toBe(4);
  });

  it("compares hourly averages instead of raw totals", () => {
    const flow = [
      { label: "00:00-06:00", value: 240 },
      { label: "06:00-11:00", value: 200 },
      { label: "11:00-14:00", value: 180 },
      { label: "14:00-17:00", value: 150 },
      { label: "17:00-21:00", value: 280 },
      { label: "21:00-24:00", value: 120 },
    ];

    expect(flowBucketHourlyAverage(flow[0])).toBe(40);
    expect(flowBucketHourlyAverage(flow[2])).toBe(60);
    expect(flowBucketHourlyAverage(flow[4])).toBe(70);
    expect(demandFromFlow(flow)).toEqual([57, 57, 86, 71, 100, 57]);
  });

  it("keeps missing source buckets unavailable", () => {
    const flow = [
      { label: "00:00-06:00", value: null },
      { label: "06:00-11:00", value: 100 },
    ];

    expect(demandFromFlow(flow)).toEqual([null, 100]);
  });
});
