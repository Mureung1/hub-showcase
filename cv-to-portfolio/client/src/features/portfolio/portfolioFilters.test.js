import { describe, expect, it } from "vitest";
import {
  ALL_THEMES,
  filterPortfolios,
  getPortfolioThemeOptions,
} from "./portfolioFilters.js";

const PORTFOLIOS = [
  {
    id: "1",
    name: "김지우",
    title: "Frontend Engineer",
    themeSlug: "minimal-clean",
    themeName: "Minimal Clean",
  },
  {
    id: "2",
    name: "이서연",
    title: "Product Designer",
    themeSlug: "creative-gradient",
    themeName: "Creative Gradient",
  },
  {
    id: "3",
    name: "박민준",
    title: "Frontend Engineer",
    themeSlug: "minimal-clean",
    themeName: "Minimal Clean",
  },
];

describe("portfolio filters", () => {
  it("이름과 직함을 대소문자와 앞뒤 공백에 관계없이 검색한다", () => {
    expect(filterPortfolios(PORTFOLIOS, { query: "  frontend " })).toHaveLength(2);
    expect(filterPortfolios(PORTFOLIOS, { query: "서연" })[0].id).toBe("2");
  });

  it("선택한 디자인의 기록만 반환한다", () => {
    const result = filterPortfolios(PORTFOLIOS, {
      themeSlug: "creative-gradient",
    });

    expect(result.map((portfolio) => portfolio.id)).toEqual(["2"]);
  });

  it("검색어와 디자인 조건을 함께 적용한다", () => {
    const result = filterPortfolios(PORTFOLIOS, {
      query: "frontend",
      themeSlug: "minimal-clean",
    });

    expect(result).toHaveLength(2);
    expect(filterPortfolios(PORTFOLIOS, { themeSlug: ALL_THEMES })).toHaveLength(3);
  });

  it("중복 없는 디자인 선택지를 만든다", () => {
    expect(getPortfolioThemeOptions(PORTFOLIOS)).toEqual([
      { slug: "minimal-clean", name: "Minimal Clean" },
      { slug: "creative-gradient", name: "Creative Gradient" },
    ]);
  });
});
