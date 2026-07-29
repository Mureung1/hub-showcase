import { describe, it, expect, vi, beforeEach } from "vitest";
import { generateJson } from "./llmClient.js";
import { buildBrandProfileSummary } from "./brandProfileContent.js";

vi.mock("./llmClient.js", () => ({ generateJson: vi.fn() }));

beforeEach(() => {
  generateJson.mockReset();
});

describe("buildBrandProfileSummary", () => {
  it("8개 필드가 모두 있으면 LLM이 만든 summary/keywords를 그대로 반환한다", async () => {
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
    generateJson.mockResolvedValue({
      summary: "동네 주민이 자주 찾는 가성비 좋은 디저트 카페",
      keywords: ["아늑함", "가성비", "디저트"],
    });

    // Act
    const result = await buildBrandProfileSummary(answers);

    // Assert
    expect(result).toEqual({
      summary: "동네 주민이 자주 찾는 가성비 좋은 디저트 카페",
      keywords: ["아늑함", "가성비", "디저트"],
    });
    expect(generateJson).toHaveBeenCalledTimes(1);
  });

  it("필드 하나가 없으면 LLM을 호출하지 않고 MISSING_FIELDS 에러를 던진다", async () => {
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
    await expect(buildBrandProfileSummary(answers)).rejects.toThrowError(
      expect.objectContaining({ status: 400, code: "MISSING_FIELDS" })
    );
    expect(generateJson).not.toHaveBeenCalled();
  });

  it("필드 값이 빈 문자열이면 MISSING_FIELDS 에러를 던진다", async () => {
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
    await expect(buildBrandProfileSummary(answers)).rejects.toThrowError(
      expect.objectContaining({ status: 400, code: "MISSING_FIELDS" })
    );
  });

  it("필드 여러 개가 없으면 에러 메시지에 누락된 필드명이 모두 포함된다", async () => {
    // Arrange
    const answers = {
      businessType: "디저트 카페",
      storeName: "OO카페",
    };

    // Act & Assert
    await expect(buildBrandProfileSummary(answers)).rejects.toThrowError(
      expect.objectContaining({
        status: 400,
        code: "MISSING_FIELDS",
        message: expect.stringMatching(/mainProduct/),
      })
    );
  });
});
