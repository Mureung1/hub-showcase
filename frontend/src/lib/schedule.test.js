import { describe, it, expect } from "vitest";
import { buildDayPlan } from "./schedule.js";

// buildDayPlan은 "24시간 - 필수시간"의 자유시간에 학습·회복 블록을 배치하는 순수 함수다(이슈 #19).
// 아래 테스트는 TDD로 먼저 작성했다: overloaded 판정은 이 테스트를 실패(red)로 두고 구현해 통과(green)시켰다.

describe("buildDayPlan 자유시간 계산", () => {
  it("필수시간 미입력이면 하루 전체(1440분)가 자유시간이다", () => {
    const plan = buildDayPlan({});
    expect(plan.freeMinutes).toBe(24 * 60);
    expect(plan.overloaded).toBe(false);
  });

  it("필수시간 합의 40%(상한 180분)만 학습 예산으로 쓰므로 블록이 과도하게 잡히지 않는다", () => {
    // 자유 3시간(180분) → 예산 min(180, 72)=72분 → 20분 focus 3개(60) + 회복 3분
    const plan = buildDayPlan({
      essentialHours: { sleep: 8, class: 6, meal: 3, etc: 4 }, // 21h → free 180m
      recommendations: [{ title: "A", action: "a" }, { title: "B", action: "b" }, { title: "C", action: "c" }],
    });
    expect(plan.freeMinutes).toBe(180);
    expect(plan.blocks.filter((b) => b.kind === "focus")).toHaveLength(3);
    expect(plan.studyMinutes).toBe(63); // focus 20*3 + 회복 3
    expect(plan.overloaded).toBe(false);
  });
});

describe("buildDayPlan 과부하(overloaded) 판정", () => {
  it("필수시간 합이 24시간을 초과하면 overloaded=true이고 자유시간은 0으로 잘린다", () => {
    const plan = buildDayPlan({ essentialHours: { sleep: 20, class: 6 } }); // 26h
    expect(plan.overloaded).toBe(true);
    expect(plan.freeMinutes).toBe(0);
    expect(plan.blocks).toHaveLength(0);
  });

  it("필수시간 합이 정확히 24시간이면 자유시간은 0이지만 초과는 아니므로 overloaded=false다", () => {
    const plan = buildDayPlan({ essentialHours: { sleep: 12, class: 12 } }); // 24h 정확
    expect(plan.freeMinutes).toBe(0);
    expect(plan.overloaded).toBe(false);
  });
});

describe("buildDayPlan 방어적 입력 처리", () => {
  it("음수·문자열 등 잘못된 필수시간은 0으로 처리해 예외 없이 동작한다", () => {
    const plan = buildDayPlan({ essentialHours: { a: -5, b: "abc", c: 3 } }); // 유효한 건 3h만
    expect(plan.freeMinutes).toBe((24 - 3) * 60);
    expect(plan.overloaded).toBe(false);
  });
});
