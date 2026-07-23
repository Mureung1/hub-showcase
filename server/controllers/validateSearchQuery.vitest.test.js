import { describe, expect, it } from "vitest";
import { validateSearchQuery } from "./validateSearchQuery.js";

describe("validateSearchQuery", () => {
  it("undefined이면 검색어 필수 입력 오류를 반환해야 한다", () => {
    const result = validateSearchQuery(undefined);

    expect(result).toEqual({ errorMessage: "검색어를 입력해주세요." });
  });

  it("null이면 검색어 필수 입력 오류를 반환해야 한다", () => {
    const result = validateSearchQuery(null);

    expect(result).toEqual({ errorMessage: "검색어를 입력해주세요." });
  });

  it("숫자이면 검색어 필수 입력 오류를 반환해야 한다", () => {
    const result = validateSearchQuery(123);

    expect(result).toEqual({ errorMessage: "검색어를 입력해주세요." });
  });

  it("빈 문자열이면 검색어 필수 입력 오류를 반환해야 한다", () => {
    const result = validateSearchQuery("");

    expect(result).toEqual({ errorMessage: "검색어를 입력해주세요." });
  });

  it("공백만 입력하면 검색어 필수 입력 오류를 반환해야 한다", () => {
    const result = validateSearchQuery("   ");

    expect(result).toEqual({ errorMessage: "검색어를 입력해주세요." });
  });

  it("앞뒤 공백 제거 후 1글자이면 최소 길이 오류를 반환해야 한다", () => {
    const result = validateSearchQuery(" a ");

    expect(result).toEqual({ errorMessage: "검색어는 2글자 이상 입력해주세요." });
  });

  it("검색어가 정확히 2글자이면 정규화된 검색어를 반환해야 한다", () => {
    const result = validateSearchQuery("ab");

    expect(result).toEqual({ query: "ab" });
  });

  it("검색어의 앞뒤 공백을 제거해야 한다", () => {
    const result = validateSearchQuery("  ditto  ");

    expect(result).toEqual({ query: "ditto" });
  });

  it("검색어의 내부 공백은 유지해야 한다", () => {
    const result = validateSearchQuery("new jeans");

    expect(result).toEqual({ query: "new jeans" });
  });
});
