import { describe, expect, it } from "vitest";
import { applyQuestPatch, calculateQuestReward, getQuestWorkflowWindows, getQuestCompletionResult } from "./questFlowPolicy";
import type { Quest } from "./questLogic";

const quest: Quest = {
  title: "핵심 정리 30분",
  type: "time",
  amount: 30,
  unit: "분",
  difficulty: "normal",
  deadline: "오늘 23:59",
  rewardExp: 28,
};

describe("quest flow policy", () => {
  it("maps quest status to the workflow windows that should be focused", () => {
    expect(getQuestWorkflowWindows("active")).toEqual(["runner", "manager"]);
    expect(getQuestWorkflowWindows("failed")).toEqual(["failure", "manager"]);
    expect(getQuestWorkflowWindows("recovery")).toEqual(["recovery", "manager"]);
    expect(getQuestWorkflowWindows("success")).toEqual(["manager"]);
    expect(getQuestWorkflowWindows("draft")).toBeNull();
  });

  it("records recovery completion separately from normal success", () => {
    expect(getQuestCompletionResult("recovery")).toBe("recovery");
    expect(getQuestCompletionResult("active")).toBe("success");
  });

  it("recalculates reward and unit when a quest draft changes", () => {
    expect(applyQuestPatch(quest, { type: "quantity", amount: 12, difficulty: "hard" })).toEqual({
      ...quest,
      type: "quantity",
      amount: 12,
      difficulty: "hard",
      unit: "개",
      rewardExp: calculateQuestReward("hard", 12, "quantity"),
    });
  });
});
