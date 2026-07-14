import { describe, it, expect } from "vitest";
import { parseSalesCsv } from "./csv";

describe("parseSalesCsv", () => {
  it("헤더가 있는 CSV를 파싱한다", () => {
    const csv = "date,revenue\n2026-07-01,850000\n2026-07-02,720000";
    expect(parseSalesCsv(csv)).toEqual([
      { date: "2026-07-01", revenue: 850000 },
      { date: "2026-07-02", revenue: 720000 },
    ]);
  });

  it("천단위 콤마·공백을 제거한다", () => {
    const csv = 'date,revenue\n2026-07-01,"850,000"';
    expect(parseSalesCsv(csv)).toEqual([{ date: "2026-07-01", revenue: 850000 }]);
  });

  it("날짜 형식이 잘못되거나 매출이 비면 해당 행을 버린다", () => {
    const csv = "date,revenue\n2026-07-01,850000\nbad-date,100\n2026-07-03,";
    expect(parseSalesCsv(csv)).toEqual([{ date: "2026-07-01", revenue: 850000 }]);
  });

  it("빈 입력이면 빈 배열", () => {
    expect(parseSalesCsv("date,revenue\n")).toEqual([]);
  });
});
