import { describe, expect, it } from "vitest";
import {
  calculateStoppedRelief,
  MAX_FOCUS_SECONDS_FOR_RELIEF,
  normalizeStoppedDurationSeconds,
} from "./scoring.js";

describe("stopped Focus relief policy", () => {
  it.each([
    [4, 599, 4, 4],
    [4, 600, 3, 3],
    [3, 900, 2, 2],
    [2, 600, 1, 1],
    [1, 600, 0, 0],
    [0, 600, 0, 0],
    [6, 650, 3, 3],
  ])(
    "skipCount %s, duration %s초를 skipCount %s / Lv%s로 계산한다",
    (skipCount, durationSeconds, expectedSkipCount, expectedLevel) => {
      expect(calculateStoppedRelief(skipCount, durationSeconds)).toMatchObject({
        skipCount: expectedSkipCount,
        level: expectedLevel,
      });
    },
  );

  it.each([
    [undefined],
    [null],
    ["60"],
    [-1],
    [1.5],
    [Number.NaN],
    [Number.POSITIVE_INFINITY],
    [MAX_FOCUS_SECONDS_FOR_RELIEF + 1],
  ])("유효하지 않은 durationSeconds %s를 null로 정규화한다", (value) => {
    expect(normalizeStoppedDurationSeconds(value)).toBeNull();
  });

  it.each([[0], [59], [60], [MAX_FOCUS_SECONDS_FOR_RELIEF]])(
    "유효한 durationSeconds %s를 그대로 유지한다",
    (value) => {
      expect(normalizeStoppedDurationSeconds(value)).toBe(value);
    },
  );
});
