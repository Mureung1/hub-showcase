import { describe, expect, it } from "vitest";
import { formatRecordDate } from "./formatRecordDate";

describe("formatRecordDate", () => {
  it("2026-07-23을 한국어 날짜 형식으로 반환해야 한다", () => {
    const result = formatRecordDate("2026-07-23");

    expect(result).toBe("2026년 7월 23일");
  });

  it("한 자리 월을 앞자리 0 없이 표시해야 한다", () => {
    const result = formatRecordDate("2026-01-15");

    expect(result).toBe("2026년 1월 15일");
  });

  it("한 자리 일을 앞자리 0 없이 표시해야 한다", () => {
    const result = formatRecordDate("2026-11-05");

    expect(result).toBe("2026년 11월 5일");
  });

  it("연말 날짜를 올바르게 표시해야 한다", () => {
    const result = formatRecordDate("2026-12-31");

    expect(result).toBe("2026년 12월 31일");
  });

  it("윤년의 2월 29일을 올바르게 표시해야 한다", () => {
    const result = formatRecordDate("2024-02-29");

    expect(result).toBe("2024년 2월 29일");
  });

  it("잘못된 날짜 입력이면 기존과 동일하게 RangeError를 발생시켜야 한다", () => {
    const formatInvalidDate = () => formatRecordDate("not-a-date");

    expect(formatInvalidDate).toThrow(RangeError);
  });
});
