import { describe, expect, it } from "vitest";
import { matchesItemSearch, type Item } from "./items";

const item: Item = {
  id: 1,
  title: "AWS 자격증 준비",
  summary: "클라우드 학습 내용을 정리한 글입니다.",
  content: "https://velog.io/example",
  original_url: "https://velog.io/example",
  image_url: null,
  source_platform: "web",
  category_main: "공부",
  category_sub: "클라우드",
  is_archived: false,
  archived_at: null,
  created_at: "2026-07-23T00:00:00.000Z",
};

describe("matchesItemSearch", () => {
  it.each(["aws", "학습 내용", "VELOG.IO", "공부", "클라우드"])(
    "검색 가능한 필드에서 %s를 찾는다",
    (query) => {
      expect(matchesItemSearch(item, query)).toBe(true);
    }
  );

  it("검색어 앞뒤 공백을 무시하고 빈 검색어는 모든 항목과 일치한다", () => {
    expect(matchesItemSearch(item, "  aws  ")).toBe(true);
    expect(matchesItemSearch(item, "   ")).toBe(true);
  });

  it("일치하는 필드가 없으면 false를 반환한다", () => {
    expect(matchesItemSearch(item, "여행")).toBe(false);
  });
});
