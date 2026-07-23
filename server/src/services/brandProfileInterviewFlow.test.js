import { describe, it, expect } from "vitest";
import { getNextBrandProfileStep } from "./brandProfileInterviewFlow.js";

describe("getNextBrandProfileStep", () => {
  it("step이 없으면 첫 질문(businessType)을 반환한다", () => {
    // Arrange
    const step = undefined;

    // Act
    const result = getNextBrandProfileStep(step);

    // Assert
    expect(result).toEqual({
      done: false,
      nextStep: "businessType",
      question: "어떤 업종이신가요?",
      type: "text",
      placeholder: "예: 디저트 카페",
    });
  });

  it("step이 빈 문자열이면 첫 질문(businessType)을 반환한다", () => {
    // Arrange
    const step = "";

    // Act
    const result = getNextBrandProfileStep(step);

    // Assert
    expect(result.nextStep).toBe("businessType");
  });

  it("중간 step을 주면 다음 질문을 반환한다", () => {
    // Arrange
    const step = "businessType";

    // Act
    const result = getNextBrandProfileStep(step);

    // Assert
    expect(result).toEqual({
      done: false,
      nextStep: "storeName",
      question: "가게 이름이 어떻게 되나요?",
      type: "text",
      placeholder: "예: OO카페",
    });
  });

  it("마지막 step(goal)을 주면 done:true와 nextStep:null을 반환한다", () => {
    // Arrange
    const step = "goal";

    // Act
    const result = getNextBrandProfileStep(step);

    // Assert
    expect(result).toEqual({ done: true, nextStep: null });
  });

  it("존재하지 않는 step이면 INVALID_STEP 에러를 던진다", () => {
    // Arrange
    const step = "not-a-real-step";

    // Act & Assert
    expect(() => getNextBrandProfileStep(step)).toThrowError(
      expect.objectContaining({ status: 400, code: "INVALID_STEP" })
    );
  });
});
