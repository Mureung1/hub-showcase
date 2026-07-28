import { describe, expect, it } from "vitest";
import {
  calculateHistoryInsights,
  formatAverageEntryLevel,
  formatFocusDuration,
} from "./historyInsights.js";

const NOW = new Date("2026-07-27T03:00:00.000Z"); // 월요일 12:00 KST
const item = (completedAt, overrides = {}) => ({
  completedAt,
  durationSeconds: null,
  entryLevel: null,
  ...overrides,
});

describe("calculateHistoryInsights", () => {
  it("KST 월요일 00:00을 이번 주 시작 경계로 사용한다", () => {
    const result = calculateHistoryInsights(
      [
        item("2026-07-26T14:59:59.999Z"),
        item("2026-07-26T15:00:00.000Z"),
      ],
      NOW,
    );
    expect(result.weeklyCompletedCount).toBe(1);
  });

  it("UTC 날짜가 같아도 KST 날짜에 맞춰 집계한다", () => {
    const result = calculateHistoryInsights(
      [
        item("2026-07-25T14:59:59.999Z"),
        item("2026-07-25T15:00:00.000Z"),
      ],
      NOW,
    );
    expect(result.recentDays.map((day) => day.count)).toEqual([
      0, 0, 0, 0, 1, 1, 0,
    ]);
  });

  it("이번 주 이전 완료를 summary에서 제외한다", () => {
    const result = calculateHistoryInsights(
      [item("2026-07-26T14:59:59.999Z")],
      NOW,
    );
    expect(result.weeklyCompletedCount).toBe(0);
  });

  it("유효한 집중 시간만 합산하고 0은 포함한다", () => {
    const result = calculateHistoryInsights(
      [
        item("2026-07-27T00:00:00.000Z", { durationSeconds: 0 }),
        item("2026-07-27T00:01:00.000Z", { durationSeconds: 60 }),
        item("2026-07-27T00:02:00.000Z", { durationSeconds: null }),
        item("2026-07-27T00:03:00.000Z", { durationSeconds: -1 }),
        item("2026-07-27T00:04:00.000Z", { durationSeconds: "60" }),
        item("2026-07-27T00:05:00.000Z", { durationSeconds: Infinity }),
      ],
      NOW,
    );
    expect(result.weeklyFocusSeconds).toBe(60);
  });

  it("직접 시작과 비정상 level을 제외하고 Lv1~Lv4만 평균낸다", () => {
    const result = calculateHistoryInsights(
      [
        item("2026-07-27T00:00:00.000Z", { entryLevel: null }),
        item("2026-07-27T00:01:00.000Z", { entryLevel: 0 }),
        item("2026-07-27T00:02:00.000Z", { entryLevel: 2 }),
        item("2026-07-27T00:03:00.000Z", { entryLevel: 3 }),
        item("2026-07-27T00:04:00.000Z", { entryLevel: 5 }),
        item("2026-07-27T00:05:00.000Z", { entryLevel: "2" }),
      ],
      NOW,
    );
    expect(result.averageEntryLevel).toBe(2.5);
  });

  it("유효한 개입 기록이 없으면 평균을 null로 반환한다", () => {
    const result = calculateHistoryInsights(
      [item("2026-07-27T00:00:00.000Z")],
      NOW,
    );
    expect(result.averageEntryLevel).toBeNull();
  });

  it("오늘을 포함한 7일을 유지하고 입력 순서와 무관하게 같은 날 완료를 누적한다", () => {
    const entries = [
      item("2026-07-27T01:00:00.000Z"),
      item("2026-07-25T16:00:00.000Z"),
      item("2026-07-27T02:00:00.000Z"),
    ];
    const forward = calculateHistoryInsights(entries, NOW);
    const reverse = calculateHistoryInsights([...entries].reverse(), NOW);

    expect(forward.recentDays).toHaveLength(7);
    expect(forward.recentDays.map((day) => day.count)).toEqual([
      0, 0, 0, 0, 0, 1, 2,
    ]);
    expect(reverse.recentDays).toEqual(forward.recentDays);
    expect(forward.recentDays.at(-1).isToday).toBe(true);
  });

  it("완료가 하나도 없으면 7일과 0 ratio를 유지한다", () => {
    const result = calculateHistoryInsights([], NOW);
    expect(result.recentDays).toHaveLength(7);
    expect(result.recentDays.every((day) => day.count === 0)).toBe(true);
    expect(result.recentDays.every((day) => day.ratio === 0)).toBe(true);
  });
});

describe("History insight formatters", () => {
  it.each([
    [0, "0분"],
    [59, "1분 미만"],
    [60, "1분"],
    [17 * 60 + 59, "17분"],
    [2 * 60 * 60, "2시간"],
    [2 * 60 * 60 + 13 * 60 + 59, "2시간 13분"],
  ])("집중 시간 %s초를 %s로 표시한다", (seconds, expected) => {
    expect(formatFocusDuration(seconds)).toBe(expected);
  });

  it.each([
    [null, "—"],
    [2, "Lv2"],
    [2.25, "Lv2.3"],
  ])("평균 레벨 %s를 %s로 표시한다", (average, expected) => {
    expect(formatAverageEntryLevel(average)).toBe(expected);
  });
});
