import { describe, it, expect } from "vitest";
import { validateDeadline } from "./validateDeadline.js";

describe("validateDeadline", () => {
  it("빈 문자열이면 false를 반환한다 (happy path)", () => {
    expect(validateDeadline("")).toBe(false);
  });

  it("0이면 true를 반환한다 (경계 — 오늘 마감도 유효)", () => {
    expect(validateDeadline("0")).toBe(true);
  });

  it("음수면 false를 반환한다 (경계)", () => {
    expect(validateDeadline("-1")).toBe(false);
  });

  it("정상적인 D-day면 true를 반환한다 (happy path)", () => {
    expect(validateDeadline("3")).toBe(true);
  });
});
