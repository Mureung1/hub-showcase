import { describe, expect, it } from "vitest";
import { formatKoreanMobileNumber } from "./phone.js";

describe("formatKoreanMobileNumber", () => {
  it("010 휴대전화 번호에 하이픈을 자동으로 넣는다", () => {
    expect(formatKoreanMobileNumber("01012345678")).toBe("010-1234-5678");
  });

  it("입력 중인 번호도 현재 길이에 맞게 표시한다", () => {
    expect(formatKoreanMobileNumber("01012")).toBe("010-12");
    expect(formatKoreanMobileNumber("01012345")).toBe("010-1234-5");
  });

  it("붙여넣은 구분 문자와 11자리를 넘는 숫자를 정리한다", () => {
    expect(formatKoreanMobileNumber("010 1234-5678abc99")).toBe("010-1234-5678");
  });

  it("10자리 구형 휴대전화 번호도 표시한다", () => {
    expect(formatKoreanMobileNumber("0111234567")).toBe("011-123-4567");
  });
});
