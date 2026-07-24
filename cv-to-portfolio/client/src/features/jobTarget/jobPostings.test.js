import { describe, expect, it } from "vitest";
import { buildTargetMarkdown, getJobPosting, JOB_POSTINGS } from "./jobPostings.js";

describe("example job postings", () => {
  it("공식 출처가 있는 서로 다른 공고 5개를 제공한다", () => {
    expect(JOB_POSTINGS).toHaveLength(5);
    expect(new Set(JOB_POSTINGS.map((posting) => posting.id)).size).toBe(5);

    for (const posting of JOB_POSTINGS) {
      expect(posting.sourceUrl).toMatch(/^https:\/\//);
      expect(posting.checkedAt).toBe("2026-07-24");
      expect(posting.talentKeywords.length).toBeGreaterThanOrEqual(3);
      expect(posting.requiredSkills.length).toBeGreaterThanOrEqual(3);
      expect(posting.portfolioFocus.length).toBeGreaterThanOrEqual(3);
    }
  });

  it("선택한 공고를 생성 API용 Markdown으로 변환한다", () => {
    const posting = getJobPosting("qanda-frontend");
    const markdown = buildTargetMarkdown(posting);

    expect(markdown).toContain("QANDA");
    expect(markdown).toContain("Frontend Engineer");
    expect(markdown).toContain("Vitest");
    expect(markdown).toContain(posting.sourceUrl);
  });

  it("없는 공고는 안전하게 처리한다", () => {
    expect(getJobPosting("missing")).toBeNull();
    expect(buildTargetMarkdown(null)).toBe("");
  });
});
