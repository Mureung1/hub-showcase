import { parseReflectionAlignmentResponse } from "./reflection.alignment";

describe("parseReflectionAlignmentResponse", () => {
  it("accepts an aligned response with a candidate title", () => {
    expect(
      parseReflectionAlignmentResponse(
        JSON.stringify({
          alignment: "matched",
          matchedChallengeTitle: "분석 결과 연결",
          message: "회고 내용이 후보와 일치합니다.",
          portfolioSummary: "분석 흐름과 사용자 경험을 연결했습니다.",
          requiresUserConfirmation: false,
        }),
      ),
    ).toEqual({
      alignment: "matched",
      matchedChallengeTitle: "분석 결과 연결",
      message: "회고 내용이 후보와 일치합니다.",
      portfolioSummary: "분석 흐름과 사용자 경험을 연결했습니다.",
      requiresUserConfirmation: false,
    });
  });

  it("rejects a response with an unsupported alignment", () => {
    expect(() =>
      parseReflectionAlignmentResponse(
        JSON.stringify({
          alignment: "invented",
          matchedChallengeTitle: null,
          message: "확인 필요",
          portfolioSummary: null,
          requiresUserConfirmation: true,
        }),
      ),
    ).toThrow("회고 정합성 응답을 검증할 수 없습니다.");
  });
});
