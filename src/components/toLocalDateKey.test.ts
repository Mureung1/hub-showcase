import { describe, expect, it } from "vitest";
import { toLocalDateKey } from "./MusicRecordForm";

describe("toLocalDateKey", () => {
  it("정상 날짜를 yyyy-MM-dd 형식으로 반환해야 한다", () => {
    const date = new Date(2026, 6, 23);

    const result = toLocalDateKey(date);

    expect(result).toBe("2026-07-23");
  });

  it("한 자리 월 앞에 0을 붙여야 한다", () => {
    const date = new Date(2026, 0, 15);

    const result = toLocalDateKey(date);

    expect(result).toBe("2026-01-15");
  });

  it("한 자리 일 앞에 0을 붙여야 한다", () => {
    const date = new Date(2026, 10, 5);

    const result = toLocalDateKey(date);

    expect(result).toBe("2026-11-05");
  });

  it("두 자리 월과 일은 그대로 반환해야 한다", () => {
    const date = new Date(2026, 9, 24);

    const result = toLocalDateKey(date);

    expect(result).toBe("2026-10-24");
  });

  it("연말 날짜를 올바르게 반환해야 한다", () => {
    const date = new Date(2026, 11, 31);

    const result = toLocalDateKey(date);

    expect(result).toBe("2026-12-31");
  });

  it("윤년의 2월 29일을 올바르게 반환해야 한다", () => {
    const date = new Date(2024, 1, 29);

    const result = toLocalDateKey(date);

    expect(result).toBe("2024-02-29");
  });

  it("서로 다른 Date 객체에서 각각 올바른 날짜 문자열을 반환해야 한다", () => {
    const firstDate = new Date(2025, 2, 9);
    const secondDate = new Date(2027, 7, 17);

    const firstResult = toLocalDateKey(firstDate);
    const secondResult = toLocalDateKey(secondDate);

    expect(firstResult).toBe("2025-03-09");
    expect(secondResult).toBe("2027-08-17");
  });
});
