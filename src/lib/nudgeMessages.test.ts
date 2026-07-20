import { describe, it, expect } from "vitest";
import { buildNudgeMessage, LV1_MESSAGES } from "./nudgeMessages.js";

describe("buildNudgeMessage", () => {
  it("레벨 1이면 LV1_MESSAGES 중 하나와 microtask: null을 반환한다 (happy path)", () => {
    const result = buildNudgeMessage(1, { title: "리포트", skipCount: 0 });
    expect(LV1_MESSAGES).toContain(result.body);
    expect(result.microtask).toBeNull();
  });

  it("skipCount가 LV1_MESSAGES 길이를 넘어가도 순환해서 유효한 문구를 고른다 (경계)", () => {
    const len = LV1_MESSAGES.length;
    const result = buildNudgeMessage(1, { title: "리포트", skipCount: len * 3 + 1 });
    expect(result.body).toBe(LV1_MESSAGES[1]);
  });

  it("아직 채워지지 않은 레벨(0, 2, 3, 4)은 null을 반환한다 (경계)", () => {
    for (const level of [0, 2, 3, 4]) {
      expect(buildNudgeMessage(level, { title: "리포트", skipCount: 0 })).toBeNull();
    }
  });

  it("skipCount가 0부터 커져도 항상 LV1_MESSAGES 안의 비어있지 않은 문자열을 반환한다 (회귀)", () => {
    for (let skipCount = 0; skipCount < LV1_MESSAGES.length * 2; skipCount++) {
      const result = buildNudgeMessage(1, { title: "리포트", skipCount });
      expect(LV1_MESSAGES).toContain(result.body);
      expect(result.body.length).toBeGreaterThan(0);
    }
  });
});
