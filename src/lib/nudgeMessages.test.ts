import { describe, it, expect } from "vitest";
import { addDays } from "date-fns";
import {
  buildNudgeMessage,
  buildLv2NudgeMessage,
  buildLv3MemoryNudgeMessage,
  buildLv3PersonalizedNudgeMessage,
  isLockedToStart,
  LV1_MESSAGES,
  LV3_SAFE_FALLBACKS,
} from "./nudgeMessages.js";
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

  it("빌더가 없는 레벨(0)은 null을 반환한다 (경계)", () => {
    expect(buildNudgeMessage(0, { title: "리포트", skipCount: 0 })).toBeNull();
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

  it("외부에서 확정한 Lv2 microTask를 기존 문장 구조에 그대로 넣는다", () => {
    const microTask = "문서 파일을 열고 제목을 입력하기";
    const result = buildLv2NudgeMessage(
      {
        title: "리포트",
        type: "개인공부",
        reason: "overwhelm",
        skipCount: 0,
      },
      microTask,
    );
    expect(result.microtask).toBe(microTask);
    expect(result.body).toContain(microTask);
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

    it("클라이언트 완료 Task 목록으로 과거 행동을 추정하지 않고 안전 fallback을 사용한다", () => {
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

      expect(result.microtask).toBe(LV3_SAFE_FALLBACKS.개인공부);
      expect(result.body).toContain(result.microtask);
      expect(result.body).not.toContain("지난 완료");
      expect(result.memoryEvidence).toBeNull();
      expect(result.generationSource).toBe("rule_based");
    });

    it("매칭 이력이 없으면 회피 패턴 근거 문구 + 폴백 마이크로태스크가 표시된다 (경계)", () => {
      const result = buildNudgeMessage(3, currentTask, []);

      expect(result.microtask).toBe(LV3_SAFE_FALLBACKS.개인공부);
      expect(result.body).toContain(result.microtask);
      // 회피 패턴 근거: skipCount 숫자를 언급한다.
      expect(result.body).toContain(String(currentTask.skipCount));
    });

    it("서버 근거 기반 행동은 성공 공식으로 과장하지 않고 추적 참조를 보존한다", () => {
      const memoryEvidence = { sourceDoneEventId: "done-event-1" };
      const result = buildLv3MemoryNudgeMessage(
        "목차 후보를 세 줄로 작성하기",
        memoryEvidence,
      );

      expect(result.body).toContain("지난 완료 기록을 참고해");
      expect(result.body).not.toContain("그때 이렇게 해서 완료");
      expect(result.body).toContain(result.microtask);
      expect(result.generationSource).toBe("gemini");
      expect(result.memoryEvidence).toBe(memoryEvidence);
    });

    it("과거 근거 없는 Gemini 행동은 맞춤 제안으로 표시하고 evidence를 남기지 않는다", () => {
      const microTask = "문서에 발표 핵심 문장 한 줄 쓰기";
      const result = buildLv3PersonalizedNudgeMessage(microTask);

      expect(result.body).toContain("할 일과 회피 이유에 맞춰");
      expect(result.body).toContain(microTask);
      expect(result.microtask).toBe(microTask);
      expect(result.generationSource).toBe("gemini");
      expect(result.memoryEvidence).toBeNull();
    });

    it("9개 유형 모두 비어 있지 않은 안전 fallback을 가진다", () => {
      expect(Object.keys(LV3_SAFE_FALLBACKS)).toHaveLength(9);
      for (const value of Object.values(LV3_SAFE_FALLBACKS)) {
        expect(value.trim().length).toBeGreaterThan(0);
      }
    });
  });

  describe("레벨 4 (마감 임박 경고)", () => {
    it("실제 deadline 기준 D-day 숫자가 본문에 표시된다 (happy path)", () => {
      // 마감이 3일 뒤 → D-3
      const result = buildNudgeMessage(4, {
        title: "기말 리포트",
        type: "개인공부",
        reason: "overwhelm",
        skipCount: 5,
        deadline: addDays(new Date(), 3).toISOString(),
      });
      expect(result.body).toContain("D-3");
    });

    it("deadline이 바뀌면 D-day 숫자도 그에 맞게 바뀐다 (실제 마감 기준임을 확인)", () => {
      const result = buildNudgeMessage(4, {
        title: "기말 리포트",
        type: "개인공부",
        reason: "overwhelm",
        skipCount: 8,
        deadline: addDays(new Date(), 10).toISOString(),
      });
      expect(result.body).toContain("D-10");
    });

    it("레벨 4에서는 '지금 시작하기' 외 다른 선택지를 잠근다 (다른 버튼 미노출)", () => {
      // 레벨 4만 true, 그 외 레벨은 false — NudgeModal이 이 값으로 닫기 등 다른 버튼을 숨긴다.
      expect(isLockedToStart(4)).toBe(true);
      for (const level of [0, 1, 2, 3]) {
        expect(isLockedToStart(level)).toBe(false);
      }
    });
  });
});
