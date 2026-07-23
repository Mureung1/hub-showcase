import { describe, expect, it } from "vitest";
import { isValidBirthYear } from "./validation";

describe("isValidBirthYear", () => {
  it("올해 태어난 경우도 유효하다", () => {
    expect(isValidBirthYear(new Date().getFullYear())).toBe(true);
  });

  it("1900년생은 유효하다", () => {
    expect(isValidBirthYear(1900)).toBe(true);
  });

  it("1899년생은 너무 오래돼서 무효하다", () => {
    expect(isValidBirthYear(1899)).toBe(false);
  });

  it("내년 이후 출생연도는 무효하다", () => {
    expect(isValidBirthYear(new Date().getFullYear() + 1)).toBe(false);
  });

  it("정수가 아니면 무효하다", () => {
    expect(isValidBirthYear(1995.5)).toBe(false);
  });
});
