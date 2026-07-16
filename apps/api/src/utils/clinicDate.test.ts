import { describe, expect, it } from "vitest";
import { getClinicDate } from "./clinicDate.js";

describe("getClinicDate", () => {
  it("UTC 날짜가 달라도 서울 운영일을 반환한다", () => {
    expect(getClinicDate(new Date("2026-07-15T15:30:00.000Z"))).toBe("2026-07-16");
  });
});
