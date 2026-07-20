import { describe, it, expect } from "vitest";
import { buildNudgeMessage, LV1_MESSAGES } from "./nudgeMessages.js";
import {
  MICROTASK_TEMPLATES,
  CUSTOM_FALLBACK_MICROTASKS,
} from "./microtaskTemplates.js";

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

  it("아직 채워지지 않은 레벨(0, 3, 4)은 null을 반환한다 (경계)", () => {
    for (const level of [0, 3, 4]) {
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

  it("레벨 2면 type/reason에 맞는 마이크로태스크가 body와 microtask 필드에 함께 들어간다 (happy path)", () => {
    const result = buildNudgeMessage(2, {
      title: "리포트",
      type: "개인공부",
      reason: "overwhelm",
      skipCount: 0,
    });
    expect(MICROTASK_TEMPLATES["개인공부"].overwhelm).toContain(result.microtask);
    expect(result.body).toContain(result.microtask);
  });

  it("레벨 2에서 type/reason이 미등록 조합이어도 커스텀 폴백 마이크로태스크로 떨어진다 (경계)", () => {
    const result = buildNudgeMessage(2, {
      title: "리포트",
      type: "존재하지않는유형",
      reason: "overwhelm",
      skipCount: 0,
    });
    expect(CUSTOM_FALLBACK_MICROTASKS).toContain(result.microtask);
    expect(result.body).toContain(result.microtask);
  });

  it("레벨 2에서 reason이 없어도(undefined) 폴백 마이크로태스크로 항상 문자열을 반환한다 (회귀)", () => {
    const result = buildNudgeMessage(2, {
      title: "리포트",
      type: "개인공부",
      reason: undefined,
      skipCount: 0,
    });
    expect(typeof result.microtask).toBe("string");
    expect(result.microtask.length).toBeGreaterThan(0);
  });
});
