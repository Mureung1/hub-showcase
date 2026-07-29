import { describe, expect, it } from "vitest";
import { formatKoreanClockTime, formatRemainingUntilEndOfDay } from "./timeFormatting";

describe("time formatting", () => {
  it("formats remaining time until the end of the current day", () => {
    expect(formatRemainingUntilEndOfDay(new Date("2026-07-29T21:30:10.000+09:00"))).toBe("02:29:49");
  });

  it("clamps remaining time at zero after the day deadline", () => {
    expect(formatRemainingUntilEndOfDay(new Date("2026-07-29T23:59:59.999+09:00"))).toBe("00:00:00");
  });

  it("formats the tray clock as a stable 24-hour time", () => {
    expect(formatKoreanClockTime(new Date("2026-07-29T09:05:00.000+09:00"))).toBe("09:05");
  });
});
