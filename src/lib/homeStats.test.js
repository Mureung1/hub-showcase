import { describe, expect, it } from "vitest";
import { calculateHomeStats } from "./homeStats.js";

const NOW = new Date("2026-07-27T03:00:00.000Z");

function task(status, deadline) {
  return { status, deadline };
}

function history(completedAt) {
  return { completedAt };
}

describe("calculateHomeStats", () => {
  it("진행 중에는 active만 포함하고 waiting과 done은 제외한다", () => {
    const result = calculateHomeStats(
      [
        task("active", "2026-07-28T03:00:00.000Z"),
        task("waiting", "2026-07-28T03:00:00.000Z"),
        task("done", "2026-07-28T03:00:00.000Z"),
      ],
      [],
      0,
      NOW,
    );
    expect(result.activeCount).toBe(1);
  });

  it("정확히 24시간인 deadline은 포함하고 1ms 초과하면 제외한다", () => {
    const result = calculateHomeStats(
      [
        task("active", "2026-07-28T03:00:00.000Z"),
        task("active", "2026-07-28T03:00:00.001Z"),
      ],
      [],
      0,
      NOW,
    );
    expect(result.urgentCount).toBe(1);
  });

  it("기한 초과 active와 waiting은 포함하고 done은 제외한다", () => {
    const result = calculateHomeStats(
      [
        task("active", "2026-07-26T03:00:00.000Z"),
        task("waiting", "2026-07-26T03:00:00.000Z"),
        task("done", "2026-07-26T03:00:00.000Z"),
      ],
      [],
      0,
      NOW,
    );
    expect(result.urgentCount).toBe(2);
  });

  it("기한이 없거나 잘못된 deadline은 제외한다", () => {
    const result = calculateHomeStats(
      [
        task("active", null),
        task("active", undefined),
        task("active", "잘못된 날짜"),
      ],
      [],
      0,
      NOW,
    );
    expect(result.urgentCount).toBe(0);
  });

  it("UTC가 달라도 KST 오늘에 속한 완료만 집계한다", () => {
    const result = calculateHomeStats(
      [],
      [
        history("2026-07-26T14:59:59.999Z"),
        history("2026-07-26T15:00:00.000Z"),
        history("2026-07-27T02:59:59.999Z"),
      ],
      0,
      NOW,
    );
    expect(result.todayCompletedCount).toBe(2);
  });

  it("같은 KST 날짜 완료를 모두 누적하고 잘못된 날짜는 제외한다", () => {
    const result = calculateHomeStats(
      [],
      [
        history("2026-07-27T00:00:00.000Z"),
        history("잘못된 날짜"),
        history("2026-07-26T16:00:00.000Z"),
      ],
      0,
      NOW,
    );
    expect(result.todayCompletedCount).toBe(2);
  });

  it("입력 순서가 달라도 같은 값을 반환한다", () => {
    const tasks = [
      task("active", "2026-07-28T03:00:00.000Z"),
      task("waiting", "2026-07-29T03:00:00.000Z"),
    ];
    const entries = [
      history("2026-07-27T00:00:00.000Z"),
      history("2026-07-26T16:00:00.000Z"),
    ];
    expect(calculateHomeStats(tasks, entries, 3, NOW)).toEqual(
      calculateHomeStats([...tasks].reverse(), [...entries].reverse(), 3, NOW),
    );
  });

  it.each([
    [5, 5],
    [-1, 0],
    ["5", 0],
    [1.5, 0],
    [Infinity, 0],
    [NaN, 0],
  ])("streak %s를 %s로 정규화한다", (value, expected) => {
    expect(calculateHomeStats([], [], value, NOW).streak).toBe(expected);
  });
});
