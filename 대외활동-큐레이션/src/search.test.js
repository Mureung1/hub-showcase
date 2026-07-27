import { describe, it, expect } from "vitest";
import { matchesQuery } from "./search";

const p = {
  title: "2026 부산 청년 마케팅 서포터즈 모집",
  org: "부산광역시 청년플랫폼",
  eligibilityText: "대학생, 부산 거주",
};

describe("matchesQuery", () => {
  it("빈 검색어는 전부 통과", () => {
    expect(matchesQuery(p, "")).toBe(true);
    expect(matchesQuery(p, "   ")).toBe(true);
  });

  it("제목 단어 매치", () => {
    expect(matchesQuery(p, "마케팅")).toBe(true);
  });

  it("제목엔 없고 기관명에만 있는 단어도 매치", () => {
    expect(matchesQuery(p, "청년플랫폼")).toBe(true);
  });

  it("참가대상(eligibilityText) 단어도 매치", () => {
    expect(matchesQuery(p, "거주")).toBe(true);
  });

  it("여러 키워드는 모두 포함해야 매치(AND)", () => {
    expect(matchesQuery(p, "부산 서포터즈")).toBe(true); // 둘 다 있음
    expect(matchesQuery(p, "부산 장학금")).toBe(false); // 장학금은 없음
  });

  it("대소문자·앞뒤 공백 무시", () => {
    expect(matchesQuery({ title: "AI 해커톤" }, "ai")).toBe(true);
    expect(matchesQuery(p, "  마케팅  ")).toBe(true);
  });

  it("아예 없는 단어는 불일치", () => {
    expect(matchesQuery(p, "코딩")).toBe(false);
  });

  it("필드가 비어도 안 터진다", () => {
    expect(matchesQuery({ title: "테스트" }, "테스트")).toBe(true);
    expect(matchesQuery({}, "뭐든")).toBe(false);
  });
});
