import { describe, expect, it } from "vitest";
import { calculateDateStreak } from "./dateStreak.js";

const date = (iso: string) => new Date(iso);
const NOW = date("2026-07-27T03:00:00.000Z"); // 2026-07-27 12:00 KST

describe("calculateDateStreak", () => {
  it("returns 0 when there are no completion events", () => {
    expect(calculateDateStreak([], NOW)).toBe(0);
  });

  it("counts multiple completions on the same KST day only once", () => {
    expect(
      calculateDateStreak(
        [
          date("2026-07-27T00:00:00.000Z"),
          date("2026-07-27T02:00:00.000Z"),
        ],
        NOW,
      ),
    ).toBe(1);
  });

  it("keeps yesterday's streak while today is still unfinished", () => {
    expect(
      calculateDateStreak(
        [
          date("2026-07-24T16:00:00.000Z"),
          date("2026-07-25T16:00:00.000Z"),
        ],
        NOW,
      ),
    ).toBe(2);
  });

  it("returns 0 when today and yesterday are unfinished", () => {
    expect(
      calculateDateStreak([date("2026-07-24T16:00:00.000Z")], NOW),
    ).toBe(0);
  });

  it("calculates the same result regardless of input order", () => {
    const ordered = [
      date("2026-07-27T01:00:00.000Z"),
      date("2026-07-26T01:00:00.000Z"),
      date("2026-07-25T01:00:00.000Z"),
    ];
    expect(calculateDateStreak(ordered, NOW)).toBe(3);
    expect(calculateDateStreak([ordered[1], ordered[0], ordered[2]], NOW)).toBe(
      3,
    );
  });

  it("uses the Asia/Seoul day boundary instead of the server timezone", () => {
    expect(
      calculateDateStreak(
        [
          date("2026-07-25T14:59:59.999Z"), // 7/25 KST
          date("2026-07-25T15:00:00.000Z"), // 7/26 KST
          date("2026-07-26T15:00:00.000Z"), // 7/27 KST
        ],
        NOW,
      ),
    ).toBe(3);
  });

  it("starts again at 1 after a missed day", () => {
    expect(
      calculateDateStreak(
        [
          date("2026-07-27T00:00:00.000Z"),
          date("2026-07-25T00:00:00.000Z"),
          date("2026-07-24T00:00:00.000Z"),
        ],
        NOW,
      ),
    ).toBe(1);
  });

  it("ignores completion timestamps in the future", () => {
    expect(
      calculateDateStreak(
        [
          date("2026-07-27T00:00:00.000Z"),
          date("2026-07-28T00:00:00.000Z"),
        ],
        NOW,
      ),
    ).toBe(1);
  });
});
