import { describe, expect, it } from "vitest";
import { isQuoteInSource, validateEvidenceQuotes, type EvidenceValidationResult } from "./evidenceValidator";

describe("evidenceValidator (TDD Cycle)", () => {
  const sourceText = `민지는 첫 화면에서 사용자가 입력 방법을 바로 이해해야 한다고 말했다.
서준은 단순 요약보다 결정 배경과 미결 질문을 연결해야 한다고 제안했다.
팀은 직접 붙여넣는 방식으로 MVP를 시작하기로 결정했다.`;

  it("isQuoteInSource checks individual substring presence accurately", () => {
    expect(isQuoteInSource(sourceText, "민지는 첫 화면에서 사용자가 입력 방법을 바로 이해해야 한다고 말했다.")).toBe(true);
    expect(isQuoteInSource(sourceText, "없는 문장입니다")).toBe(false);
    expect(isQuoteInSource("", "test")).toBe(false);
  });

  it("returns valid=true when all quotes exist in the exact source text", () => {
    const validQuotes = [
      "민지는 첫 화면에서 사용자가 입력 방법을 바로 이해해야 한다고 말했다.",
      "팀은 직접 붙여넣는 방식으로 MVP를 시작하기로 결정했다.",
    ];

    const result: EvidenceValidationResult = validateEvidenceQuotes(sourceText, validQuotes);

    expect(result.valid).toBe(true);
    expect(result.missingQuotes).toEqual([]);
    expect(result.validCount).toBe(2);
    expect(result.totalCount).toBe(2);
  });

  it("detects hallucinated or modified quotes and returns valid=false with missingQuotes list", () => {
    const mixedQuotes = [
      "민지는 첫 화면에서 사용자가 입력 방법을 바로 이해해야 한다고 말했다.",
      "서준은 AI 그라데이션 스타일을 추가하자고 말했다.", // Hallucinated quote
    ];

    const result: EvidenceValidationResult = validateEvidenceQuotes(sourceText, mixedQuotes);

    expect(result.valid).toBe(false);
    expect(result.missingQuotes).toEqual(["서준은 AI 그라데이션 스타일을 추가하자고 말했다."]);
    expect(result.validCount).toBe(1);
    expect(result.totalCount).toBe(2);
  });

  it("handles normalized whitespace and empty quote list gracefully", () => {
    expect(validateEvidenceQuotes(sourceText, [])).toEqual({
      valid: true,
      missingQuotes: [],
      validCount: 0,
      totalCount: 0,
    });
  });
});
