import { describe, expect, it } from "vitest";
import { scoreAndRank, parseNumber } from "./matching.js";

describe("parseNumber", () => {
  it("문자열에서 첫 숫자(소수 포함)를 뽑아낸다", () => {
    expect(parseNumber("3.8 / 4.5")).toBe(3.8);
    expect(parseNumber("120")).toBe(120);
  });

  it("숫자가 없으면 0을 반환한다", () => {
    expect(parseNumber("전공 무관")).toBe(0);
  });
});

describe("scoreAndRank - 크롤링된 복합 keywords(\"a/b/c\" 형태) 매칭", () => {
  const profile = {
    major: "기계공학과",
    certificates: ["생산관리기사"],
    experience: "자동차 부품 생산라인 현장실습 2개월",
    gpa: "3.8",
  };

  it("\"생산직/조립/가공\"처럼 슬래시로 묶인 keyword도 부분 토큰이 프로필 텍스트에 있으면 매칭된다", () => {
    const relevantPosting = {
      id: 1,
      deadline: "2026-08-09",
      gpaMin: 0,
      keywords: ["생산직/조립/가공", "기계/자동차/조선", "생산/제조"],
    };
    const irrelevantPosting = {
      id: 2,
      deadline: "2026-07-31",
      gpaMin: 0,
      keywords: ["예체능/패션", "기타"],
    };

    const ranked = scoreAndRank(profile, [irrelevantPosting, relevantPosting]);

    expect(ranked[0].id).toBe(1);
    expect(ranked[0].score).toBeGreaterThan(ranked[1].score);
  });

  it("마감일이 더 빨라도 전공/경험과 무관한 공고보다 키워드가 겹치는 공고를 우선한다", () => {
    const soonButIrrelevant = {
      id: 10,
      deadline: "2026-07-31",
      gpaMin: 0,
      keywords: ["서포터즈"],
    };
    const laterButRelevant = {
      id: 4,
      deadline: "2026-08-21",
      gpaMin: 0,
      keywords: ["생산/제조"],
    };

    const ranked = scoreAndRank(profile, [soonButIrrelevant, laterButRelevant]);

    expect(ranked[0].id).toBe(4);
  });
});
