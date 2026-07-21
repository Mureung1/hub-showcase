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

  it("아직 채워지지 않은 레벨(0, 4)은 null을 반환한다 (경계)", () => {
    for (const level of [0, 4]) {
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

  describe("레벨 3 (기억 기반 개입)", () => {
    // 현재 미루고 있는 할일(개인공부 / overwhelm)
    const currentTask = {
      id: "cur",
      title: "기말 리포트",
      type: "개인공부",
      reason: "overwhelm",
      customReasonText: null,
      skipCount: 5,
    };

    it("매칭되는 완료 이력이 있으면 그때(과거 task 유형)의 마이크로태스크가 그대로 표시된다 (happy path)", () => {
      const completedTasks = [
        {
          id: "past",
          title: "중간 리포트",
          type: "리포트/글쓰기",
          status: "done",
          reason: "overwhelm",
          customReasonText: null,
        },
      ];

      const result = buildNudgeMessage(3, currentTask, completedTasks);

      // #25 재생성: 매칭된 과거 task의 유형(리포트/글쓰기) 풀에서 나온 문구여야 한다
      // (현재 할일의 유형 '개인공부'가 아니라) — 기억 기반 경로임을 증명.
      expect(MICROTASK_TEMPLATES["리포트/글쓰기"].overwhelm).toContain(result.microtask);
      // 그 마이크로태스크가 본문에 그대로 담긴다.
      expect(result.body).toContain(result.microtask);
      // 근거로 과거 task의 유형을 언급한다.
      expect(result.body).toContain("리포트/글쓰기");
    });

    it("매칭 이력이 없으면 회피 패턴 근거 문구 + 폴백 마이크로태스크가 표시된다 (경계)", () => {
      const result = buildNudgeMessage(3, currentTask, []);

      // 폴백: 현재 할일 자신의 유형(개인공부) 풀에서 나온 문구.
      expect(MICROTASK_TEMPLATES["개인공부"].overwhelm).toContain(result.microtask);
      expect(result.body).toContain(result.microtask);
      // 회피 패턴 근거: skipCount 숫자를 언급한다.
      expect(result.body).toContain(String(currentTask.skipCount));
    });
  });
});
