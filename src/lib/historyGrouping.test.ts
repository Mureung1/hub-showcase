import { describe, it, expect } from "vitest";
import { dateKey, groupTasksByDate, buildMonthGrid } from "./historyGrouping.js";

describe("dateKey", () => {
  it("ISO 문자열을 로컬 달력일(YYYY-MM-DD) 키로 변환한다 (happy path)", () => {
    expect(dateKey("2026-07-22T09:00:00.000Z")).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe("groupTasksByDate", () => {
  it("같은 날짜의 task를 하나의 배열로 묶는다 (happy path)", () => {
    const tasks = [
      { id: "1", createdAt: "2026-07-22T01:00:00.000Z" },
      { id: "2", createdAt: "2026-07-22T05:00:00.000Z" },
      { id: "3", createdAt: "2026-07-23T01:00:00.000Z" },
    ];

    const result = groupTasksByDate(tasks);
    const keys = Object.keys(result);

    expect(keys).toHaveLength(2);
    const dayWithTwo = keys.find((k) => result[k].length === 2);
    expect(dayWithTwo).toBeDefined();
    expect(result[dayWithTwo as string].map((t) => t.id).sort()).toEqual(["1", "2"]);
  });

  it("빈 배열이면 빈 객체를 반환한다 (경계)", () => {
    expect(groupTasksByDate([])).toEqual({});
  });
});

describe("buildMonthGrid", () => {
  it("항상 7의 배수 길이의 날짜 배열을 반환한다 (경계)", () => {
    const grid = buildMonthGrid(new Date("2026-07-01T00:00:00"));
    expect(grid.length % 7).toBe(0);
  });

  it("해당 월의 1일과 마지막 날을 포함한다 (happy path)", () => {
    const grid = buildMonthGrid(new Date("2026-02-15T00:00:00"));
    const iso = grid.map((d) => d.toDateString());
    expect(iso).toContain(new Date("2026-02-01T00:00:00").toDateString());
    expect(iso).toContain(new Date("2026-02-28T00:00:00").toDateString());
  });
});
