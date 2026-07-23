import { describe, expect, it } from "vitest";
import { getTimeOfDay } from "./worldState";

describe("world state", () => {
  it.each([
    ["2026-07-23T06:00:00", "morning"],
    ["2026-07-23T13:00:00", "afternoon"],
    ["2026-07-23T19:00:00", "evening"],
    ["2026-07-23T23:00:00", "night"],
  ] as const)("maps %s to %s", (iso, expected) => {
    expect(getTimeOfDay(new Date(iso))).toBe(expected);
  });
});
