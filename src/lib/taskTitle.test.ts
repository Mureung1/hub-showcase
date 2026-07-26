import { describe, it, expect } from "vitest";
import { validateTaskTitle } from "./taskTitle.js";

describe("validateTaskTitle", () => {
  it("빈 문자열이면 false를 반환한다 (기본)", () => {
    expect(validateTaskTitle("")).toBe(false);
  });

  it("공백 문자만 있으면 false를 반환한다 (경계 — trim 시 내용 없음)", () => {
    expect(validateTaskTitle("   ")).toBe(false);
    expect(validateTaskTitle("\t\n")).toBe(false);
  });

  it("정상적인 제목이면 true를 반환한다 (happy path)", () => {
    expect(validateTaskTitle("과제 제출하기")).toBe(true);
  });

  it("앞뒤 공백이 있어도 내용이 남아있으면 true를 반환한다 (경계 — trim 후 내용 있음)", () => {
    expect(validateTaskTitle("  과제 제출하기  ")).toBe(true);
  });
});
