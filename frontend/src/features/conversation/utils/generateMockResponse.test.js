import { describe, expect, it } from "vitest";
import { generateMockResponse } from "./generateMockResponse";

const neutralAnalysis = {
  possibleStates: [],
  responseApproach: "continue_normally"
};

describe("generateMockResponse", () => {
  it("recognizes common conversation intents", () => {
    expect(generateMockResponse("안녕하세요", neutralAnalysis)).toContain("안녕");
    expect(generateMockResponse("오늘 너무 피곤해", neutralAnalysis)).toContain("지친");
    expect(generateMockResponse("정말 화가 나", neutralAnalysis)).toContain("화가");
    expect(generateMockResponse("시험에 합격해서 기뻐", neutralAnalysis)).toContain("좋은 일");
  });

  it("moves from listening to clarification and a small action across turns", () => {
    const first = generateMockResponse("발표가 걱정돼", neutralAnalysis);
    const second = generateMockResponse("실수할까 봐 불안해", neutralAnalysis, {
      recentMessages: [
        { role: "user", content: "발표가 걱정돼" },
        { role: "ai", content: first }
      ]
    });
    const third = generateMockResponse("계속 걱정돼", neutralAnalysis, {
      recentMessages: [
        { role: "user", content: "발표가 걱정돼" },
        { role: "ai", content: first },
        { role: "user", content: "실수할까 봐 불안해" },
        { role: "ai", content: second }
      ]
    });

    expect(first).toContain("가장 걱정");
    expect(second).toContain("해결 방법");
    expect(third).toContain("가장 작은");
    expect(new Set([first, second, third]).size).toBe(3);
  });

  it("avoids repeating the immediately previous response", () => {
    const repeatedCandidate =
      "네 이야기를 천천히 들려줘. 지금 가장 마음에 남는 장면은 뭐야?";
    const response = generateMockResponse("그냥 그래", neutralAnalysis, {
      recentMessages: [{ role: "ai", content: repeatedCandidate }]
    });

    expect(response).not.toBe(repeatedCandidate);
  });

  it("uses a fixed safety response for urgent self-harm language", () => {
    const response = generateMockResponse("죽고 싶어", neutralAnalysis);

    expect(response).toContain("가까운 사람");
    expect(response).toContain("응급 서비스");
  });
});
