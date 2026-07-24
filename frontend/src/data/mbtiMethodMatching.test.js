import { describe, it, expect } from "vitest";
import { matchMethods } from "./mbtiMethodMatching.js";

const ALL_16_TYPES = [
  "ISTJ", "ISFJ", "ESTJ", "ESFJ",
  "ISTP", "ISFP", "ESTP", "ESFP",
  "INTJ", "INTP", "ENTJ", "ENTP",
  "INFJ", "INFP", "ENFJ", "ENFP",
];

describe("matchMethods 정상 케이스", () => {
  it("ISTJ(SJ) 입력 시 temperament·adjustments·reason·sources를 정확히 반환한다", () => {
    const result = matchMethods("ISTJ");

    expect(result.temperament).toBe("SJ");
    expect(result.temperamentLabel).toBe("관리자형(SJ)");
    expect(result.reason).toBe(
      "계획·자기관리 강점을 분산·환경설계로 살리고, 유연성은 교차학습으로 보완합니다.",
    );
    expect(result.sources).toEqual(["E3", "E1", "F1"]);
  });

  it("ISTJ의 spacing 값은 strengths(8) + T축(2) + J축(3) = 13으로 여러 출처가 누적 합산된다", () => {
    const result = matchMethods("ISTJ");
    expect(result.adjustments.spacing).toBe(13);
  });

  it.each([
    ["ISTP", "SP", "실용형(SP)"],
    ["INTJ", "NT", "분석형(NT)"],
    ["INFP", "NF", "이상형(NF)"],
  ])("%s 입력 시 temperament는 %s로 매핑된다", (mbti, temperament, label) => {
    const result = matchMethods(mbti);
    expect(result.temperament).toBe(temperament);
    expect(result.temperamentLabel).toBe(label);
    expect(Object.keys(result.adjustments).length).toBeGreaterThan(0);
  });
});

describe("matchMethods 빈 값", () => {
  it.each([
    ["빈 문자열", ""],
    ["undefined", undefined],
    ["null", null],
  ])("%s 입력 시 early return 기본값을 반환한다", (_label, input) => {
    const result = matchMethods(input);
    expect(result).toEqual({ temperament: null, adjustments: {}, reason: "", sources: [] });
  });
});

describe("matchMethods 경계값", () => {
  it("길이 3(짧은 문자열)이면 early return된다", () => {
    const result = matchMethods("IST");
    expect(result).toEqual({ temperament: null, adjustments: {}, reason: "", sources: [] });
  });

  it("길이 5(긴 문자열)이면 early return된다", () => {
    const result = matchMethods("ISTJX");
    expect(result).toEqual({ temperament: null, adjustments: {}, reason: "", sources: [] });
  });

  it("길이 4지만 등록되지 않은 유형(ZZZZ)이면 temperament는 null이고 axis 보정도 없어 adjustments가 빈 객체다", () => {
    const result = matchMethods("ZZZZ");
    expect(result.temperament).toBeNull();
    expect(result.adjustments).toEqual({});
    // early return 경로와 달리 이 경로는 temperamentLabel 키를 항상 포함한다(빈 문자열로).
    expect(result.temperamentLabel).toBe("");
  });

  it("16개 실제 유형 전체에서 adjustments 값은 항상 0 이상 MAX_ADJUSTMENT(15) 이하다", () => {
    const allValues = ALL_16_TYPES.flatMap((mbti) => Object.values(matchMethods(mbti).adjustments));

    allValues.forEach((value) => {
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThanOrEqual(15);
    });
    // 현재 데이터로는 최댓값이 14(ISFJ/INFJ의 environment)까지만 도달해 15 상한 클램프는
    // 실제 16개 유형 입력으로는 발동하지 않는다 — 방어 코드가 도달 불가능함을 문서화한다.
    expect(Math.max(...allValues)).toBe(14);
  });

  it("early return 경로는 temperamentLabel 키 자체가 없다(정상 경로와의 형태 불일치)", () => {
    const result = matchMethods("");
    expect(Object.prototype.hasOwnProperty.call(result, "temperamentLabel")).toBe(false);
  });
});

describe("matchMethods 실패하는 경우(비정상 입력)", () => {
  it("숫자 입력이면 예외 없이 early return된다", () => {
    expect(() => matchMethods(1234)).not.toThrow();
    expect(matchMethods(1234)).toEqual({ temperament: null, adjustments: {}, reason: "", sources: [] });
  });

  it("객체 입력이면 예외 없이 early return된다", () => {
    expect(() => matchMethods({})).not.toThrow();
    expect(matchMethods({})).toEqual({ temperament: null, adjustments: {}, reason: "", sources: [] });
  });

  it("공백이 포함된 4글자 문자열('IST ')은 등록된 유형과 매칭되지 않는다", () => {
    const result = matchMethods("IST ");
    expect(result.temperament).toBeNull();
  });

  it("소문자 입력('istj')은 대소문자 구분으로 인해 등록된 유형과 매칭되지 않는다", () => {
    const result = matchMethods("istj");
    expect(result.temperament).toBeNull();
  });
});
