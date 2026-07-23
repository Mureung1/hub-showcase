import { describe, it, expect } from "vitest";
import { buildBrandProfileSummary } from "./brandProfileContent.js";

describe("buildBrandProfileSummary", () => {
  it("8개 필드가 모두 있으면 summary/keywords를 생성한다", () => {
    // Arrange
    const answers = {
      businessType: "디저트 카페",
      storeName: "OO카페",
      mainProduct: "티라미수, 아인슈페너",
      targetCustomer: "동네 주민",
      brandMood: "아늑하고 친근한",
      strength: "가성비 좋은 디저트",
      tone: "친근하고 다정한 말투",
      goal: "신규 고객 유입",
    };

    // Act
    const result = buildBrandProfileSummary(answers);

    // Assert
    expect(result).toEqual({
      summary: "동네 주민이 자주 찾는 가성비 좋은 디저트 디저트 카페",
      keywords: ["아늑하고 친근한", "가성비 좋은 디저트", "디저트 카페"],
    });
  });

  it("필드 하나가 없으면 MISSING_FIELDS 에러를 던진다", () => {
    // Arrange
    const answers = {
      businessType: "디저트 카페",
      mainProduct: "티라미수, 아인슈페너",
      targetCustomer: "동네 주민",
      brandMood: "아늑하고 친근한",
      strength: "가성비 좋은 디저트",
      tone: "친근하고 다정한 말투",
      goal: "신규 고객 유입",
    };

    // Act & Assert
    expect(() => buildBrandProfileSummary(answers)).toThrowError(
      expect.objectContaining({ status: 400, code: "MISSING_FIELDS" })
    );
  });

  it("필드 값이 빈 문자열이면 MISSING_FIELDS 에러를 던진다", () => {
    // Arrange
    const answers = {
      businessType: "디저트 카페",
      storeName: "",
      mainProduct: "티라미수, 아인슈페너",
      targetCustomer: "동네 주민",
      brandMood: "아늑하고 친근한",
      strength: "가성비 좋은 디저트",
      tone: "친근하고 다정한 말투",
      goal: "신규 고객 유입",
    };

    // Act & Assert
    expect(() => buildBrandProfileSummary(answers)).toThrowError(
      expect.objectContaining({ status: 400, code: "MISSING_FIELDS" })
    );
  });

  it("필드 여러 개가 없으면 에러 메시지에 누락된 필드명이 모두 포함된다", () => {
    // Arrange
    const answers = {
      businessType: "디저트 카페",
      storeName: "OO카페",
    };

    // Act & Assert
    expect(() => buildBrandProfileSummary(answers)).toThrowError(
      expect.objectContaining({
        status: 400,
        code: "MISSING_FIELDS",
        message: expect.stringMatching(/mainProduct/),
      })
    );
  });
});
