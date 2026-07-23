import { describe, expect, it } from "vitest";
import { createRecoveryQuest, type Quest } from "./questLogic";

const baseQuest: Quest = {
  title: "정보처리기사 30분 핵심 정리",
  type: "time",
  amount: 30,
  unit: "분",
  difficulty: "normal",
  deadline: "오늘 23:59",
  rewardExp: 20,
};

describe("createRecoveryQuest", () => {
  it("시간형 퀘스트를 1/3 분량의 쉬운 복구 퀘스트로 바꾼다", () => {
    const result = createRecoveryQuest(baseQuest);

    expect(result).toEqual({
      ...baseQuest,
      title: "정보처리기사 10분 핵심 개념 읽기",
      amount: 10,
      difficulty: "easy",
      rewardExp: 5,
    });
  });

  it("기존 type, unit, deadline은 유지한다", () => {
    const result = createRecoveryQuest(baseQuest);

    expect(result.type).toBe("time");
    expect(result.unit).toBe("분");
    expect(result.deadline).toBe("오늘 23:59");
  });

  it("수량형 퀘스트의 단위를 유지하고 최소 복구 분량 5를 적용한다", () => {
    const quest: Quest = {
      ...baseQuest,
      title: "오답 노트 12개 핵심 정리",
      type: "quantity",
      amount: 12,
      unit: "개",
      difficulty: "hard",
      rewardExp: 40,
    };

    const result = createRecoveryQuest(quest);

    expect(result.title).toBe("오답 노트 5개 핵심 개념 읽기");
    expect(result.amount).toBe(5);
    expect(result.type).toBe("quantity");
    expect(result.unit).toBe("개");
    expect(result.difficulty).toBe("easy");
    expect(result.rewardExp).toBe(5);
  });

  it("행동형 퀘스트에서 1/3 분량을 floor 처리한다", () => {
    const quest: Quest = {
      ...baseQuest,
      title: "스트레칭 21회 핵심 정리",
      type: "action",
      amount: 21,
      unit: "회",
    };

    const result = createRecoveryQuest(quest);

    expect(result.title).toBe("스트레칭 7회 핵심 개념 읽기");
    expect(result.amount).toBe(7);
  });

  it("title이 빈 문자열이어도 amount, difficulty, rewardExp는 복구 규칙대로 바꾼다", () => {
    const quest: Quest = {
      ...baseQuest,
      title: "",
      amount: 30,
    };

    const result = createRecoveryQuest(quest);

    expect(result.title).toBe("");
    expect(result.amount).toBe(10);
    expect(result.difficulty).toBe("easy");
    expect(result.rewardExp).toBe(5);
  });

  it("title에 amount+unit 문자열이 없으면 분량 문구는 바꾸지 않는다", () => {
    const quest: Quest = {
      ...baseQuest,
      title: "정보처리기사 핵심 정리",
      amount: 30,
      unit: "분",
    };

    const result = createRecoveryQuest(quest);

    expect(result.title).toBe("정보처리기사 핵심 개념 읽기");
    expect(result.amount).toBe(10);
  });

  it("title에 핵심 정리가 없으면 분량 문자열만 바꾼다", () => {
    const quest: Quest = {
      ...baseQuest,
      title: "정보처리기사 30분 읽기",
      amount: 30,
      unit: "분",
    };

    const result = createRecoveryQuest(quest);

    expect(result.title).toBe("정보처리기사 10분 읽기");
    expect(result.amount).toBe(10);
  });

  it.each([
    { amount: 1, expected: 5 },
    { amount: 14, expected: 5 },
    { amount: 15, expected: 5 },
    { amount: 16, expected: 5 },
    { amount: 17, expected: 5 },
    { amount: 18, expected: 6 },
    { amount: 180, expected: 60 },
  ])("경계값 amount $amount를 복구 amount $expected로 바꾼다", ({ amount, expected }) => {
    const quest: Quest = {
      ...baseQuest,
      title: `정보처리기사 ${amount}분 핵심 정리`,
      amount,
      unit: "분",
    };

    const result = createRecoveryQuest(quest);

    expect(result.amount).toBe(expected);
    expect(result.title).toBe(`정보처리기사 ${expected}분 핵심 개념 읽기`);
  });

  it("amount가 0이면 현재 구현상 최소값 5를 적용한다", () => {
    const quest: Quest = {
      ...baseQuest,
      title: "정보처리기사 0분 핵심 정리",
      amount: 0,
    };

    const result = createRecoveryQuest(quest);

    expect(result.amount).toBe(5);
    expect(result.title).toBe("정보처리기사 5분 핵심 개념 읽기");
  });

  it("amount가 음수이면 현재 구현상 최소값 5를 적용한다", () => {
    const quest: Quest = {
      ...baseQuest,
      title: "정보처리기사 -3분 핵심 정리",
      amount: -3,
    };

    const result = createRecoveryQuest(quest);

    expect(result.amount).toBe(5);
    expect(result.title).toBe("정보처리기사 5분 핵심 개념 읽기");
  });

  it("amount가 NaN이면 최소 복구 분량 5로 보정한다", () => {
    const quest: Quest = {
      ...baseQuest,
      title: "정보처리기사 NaN분 핵심 정리",
      amount: Number.NaN,
    };

    const result = createRecoveryQuest(quest);

    expect(result.amount).toBe(5);
    expect(result.title).toBe("정보처리기사 5분 핵심 개념 읽기");
    expect(result.difficulty).toBe("easy");
    expect(result.rewardExp).toBe(5);
  });
});
