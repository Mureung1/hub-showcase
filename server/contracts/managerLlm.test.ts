import { describe, expect, it } from "vitest";
import {
  managerLlmPromptVersion,
  parseManagerLlmRequest,
  resolveManagerLlmOutput,
  type ManagerLlmOutputFallback,
} from "./managerLlm";

const fallback: ManagerLlmOutputFallback = {
  managerLine: "fallback line",
  difficultyEvaluation: {
    difficulty: "normal",
    rewardExp: 16,
    reason: "fallback difficulty",
  },
  behaviorIntent: {
    behaviorStyle: "balanced",
    tone: "friendly",
    line: "fallback line",
    suggestedBehaviorBias: [],
  },
  statEvaluation: {
    difficulty: "normal",
    statBudget: 7,
    primaryStats: ["diligence"],
    statDeltas: [
      { stat: "diligence", amount: 5 },
      { stat: "stamina", amount: 2 },
    ],
    reason: "fallback stat evaluation",
  },
  goalPlan: {
    goalSummary: "Build a backend portfolio",
    horizon: "month",
    milestones: [{ id: "m1", title: "First portfolio draft", targetWeek: 1, successCriteria: ["Draft one project summary"] }],
    monthlyPlan: [{ monthIndex: 1, focus: "Portfolio foundation", milestoneIds: ["m1"] }],
    weeklyPlan: [{ weekIndex: 1, focus: "Draft", targetOutcome: "One summary", suggestedQuestThemes: ["portfolio writing"] }],
    dailySeeds: [
      {
        title: "Draft one project bullet",
        type: "quantity",
        amount: 1,
        unit: "bullet",
        difficulty: "easy",
        deadline: "today 23:59",
        rewardExp: 8,
        linkedMilestoneId: "m1",
      },
    ],
    risks: ["time shortage"],
    rebalancingPolicy: {
      onSuccess: "increase one small step",
      onFailureTimeShortage: "halve the amount",
      onFailureTooHard: "lower difficulty",
      onSkippedDays: "restart with easy seed",
    },
  },
  planRebalance: {
    rebalancedPlan: {
      goalSummary: "Build a backend portfolio",
      horizon: "month",
      milestones: [{ id: "m1", title: "First portfolio draft", targetWeek: 1, successCriteria: ["Draft one project summary"] }],
      monthlyPlan: [{ monthIndex: 1, focus: "Portfolio foundation", milestoneIds: ["m1"] }],
      weeklyPlan: [{ weekIndex: 1, focus: "Draft", targetOutcome: "One summary", suggestedQuestThemes: ["portfolio writing"] }],
      dailySeeds: [
        {
          title: "Draft one project bullet",
          type: "quantity",
          amount: 1,
          unit: "bullet",
          difficulty: "easy",
          deadline: "today 23:59",
          rewardExp: 8,
          linkedMilestoneId: "m1",
        },
      ],
      risks: ["time shortage"],
      rebalancingPolicy: {
        onSuccess: "increase one small step",
        onFailureTimeShortage: "halve the amount",
        onFailureTooHard: "lower difficulty",
        onSkippedDays: "restart with easy seed",
      },
    },
    changes: [{ scope: "daily", reason: "failure_time_shortage", before: "20 minutes", after: "10 minutes" }],
    nextQuest: {
      title: "Draft one project bullet",
      type: "quantity",
      amount: 1,
      unit: "bullet",
      difficulty: "easy",
      deadline: "today 23:59",
      rewardExp: 8,
      linkedMilestoneId: "m1",
      recoveryReason: "shorten after time shortage",
    },
  },
  questAcceptancePreview: {
    difficulty: "normal",
    rewardExp: 20,
    statEvaluation: {
      difficulty: "normal",
      statBudget: 7,
      primaryStats: ["diligence"],
      statDeltas: [
        { stat: "diligence", amount: 5 },
        { stat: "stamina", amount: 2 },
      ],
      reason: "fallback stat evaluation",
    },
    reason: "fallback acceptance preview",
  },
};

describe("manager LLM contract", () => {
  it("accepts the manager prompt input without secret-bearing fields", () => {
    const parsed = parseManagerLlmRequest({
      promptVersion: managerLlmPromptVersion,
      outputKind: "behaviorIntent",
      managerContext: {
        currentMood: "waiting",
        recentEventCount: 1,
        lastQuestResult: "success",
        memorySummary: "recent success",
        rewardHints: ["character_animation"],
      },
      profile: {
        nickname: "루카스",
        goal: "정보처리기사",
        category: "study",
        dailyMinutes: 30,
        questSize: "balanced",
        managerTone: "friendly",
      },
      persona: {
        petId: "pink-manager",
        tone: "friendly",
        questStyle: "balanced",
        feedbackStyle: "playful",
        behaviorStyle: "balanced",
      },
      questState: {
        status: "success",
        currentQuest: {
          title: "DB 개념 15분",
          type: "time",
          amount: 15,
          unit: "분",
          difficulty: "normal",
          deadline: "오늘 23:59",
          rewardExp: 20,
        },
      },
      recentEvents: [
        {
          type: "quest_completed",
          title: "DB 개념 15분",
          result: "success",
          difficulty: "normal",
          createdAt: "2026-07-29T10:00:00.000Z",
        },
      ],
    });

    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.data.profile).toEqual({
      nickname: "루카스",
      goal: "정보처리기사",
      category: "study",
      dailyMinutes: 30,
      questSize: "balanced",
      managerTone: "friendly",
    });
    expect("name" in parsed.data.profile).toBe(false);
  });

  it("falls back when the LLM behavior intent schema is invalid", () => {
    expect(
      resolveManagerLlmOutput({
        outputKind: "behaviorIntent",
        rawOutput: {
          behaviorIntent: {
            behaviorStyle: "chaotic",
            tone: "friendly",
            line: "bad",
            suggestedBehaviorBias: [],
          },
        },
        fallback,
      }),
    ).toEqual({
      ok: true,
      data: {
        behaviorIntent: fallback.behaviorIntent,
        source: "rule_fallback",
        fallbackReason: "INVALID_LLM_OUTPUT",
        promptVersion: managerLlmPromptVersion,
      },
    });
  });

  it("accepts a valid LLM difficulty evaluation", () => {
    expect(
      resolveManagerLlmOutput({
        outputKind: "difficultyEvaluation",
        rawOutput: {
          difficultyEvaluation: {
            difficulty: "hard",
            rewardExp: 40,
            reason: "large edited quest",
          },
        },
        fallback,
      }),
    ).toEqual({
      ok: true,
      data: {
        difficultyEvaluation: {
          difficulty: "hard",
          rewardExp: 40,
          reason: "large edited quest",
        },
        source: "llm",
        promptVersion: managerLlmPromptVersion,
      },
    });
  });

  it("limits manager lines to two short display lines", () => {
    const result = resolveManagerLlmOutput({
      outputKind: "managerLine",
      rawOutput: {
        managerLine: "First line is intentionally long and should still fit inside the manager window without spilling too far.\nSecond line is enough.\nThird line should be removed.",
      },
      fallback,
    });

    expect(result.data.managerLine?.split("\n")).toHaveLength(2);
    expect(result.data.managerLine?.length).toBeLessThanOrEqual(96);
  });

  it("falls back when rewardExp is outside the selected difficulty range", () => {
    expect(
      resolveManagerLlmOutput({
        outputKind: "difficultyEvaluation",
        rawOutput: {
          difficultyEvaluation: {
            difficulty: "normal",
            rewardExp: 50,
            reason: "normal should not pay hard rewards",
          },
        },
        fallback,
      }),
    ).toEqual({
      ok: true,
      data: {
        difficultyEvaluation: fallback.difficultyEvaluation,
        source: "rule_fallback",
        fallbackReason: "INVALID_LLM_OUTPUT",
        promptVersion: managerLlmPromptVersion,
      },
    });
  });

  it("falls back when a quest suggestion copies the long-term goal as the title", () => {
    expect(
      resolveManagerLlmOutput({
        outputKind: "questSuggestion",
        rawOutput: {
          questSuggestion: {
            title: "Backend Engineer Portfolio",
            type: "time",
            amount: 20,
            unit: "min",
            difficulty: "normal",
            deadline: "today 23:59",
            rewardExp: 20,
          },
        },
        fallback,
        request: {
          promptVersion: managerLlmPromptVersion,
          outputKind: "questSuggestion",
          managerContext: {
            currentMood: "waiting",
            recentEventCount: 0,
            lastQuestResult: null,
            memorySummary: "no events",
            rewardHints: [],
          },
          profile: {
            nickname: "Lucas",
            goal: "Backend Engineer Portfolio",
            category: "career",
            dailyMinutes: 30,
            questSize: "balanced",
            managerTone: "friendly",
          },
          persona: {
            petId: "pink-manager",
            tone: "friendly",
            questStyle: "balanced",
            feedbackStyle: "playful",
            behaviorStyle: "balanced",
          },
          questState: { status: "draft" },
          recentEvents: [],
        },
      }),
    ).toEqual({
      ok: true,
      data: {
        questSuggestion: fallback.questSuggestion,
        source: "rule_fallback",
        fallbackReason: "INVALID_LLM_OUTPUT",
        promptVersion: managerLlmPromptVersion,
      },
    });
  });

  it("falls back when a quest suggestion reward is outside the selected difficulty range", () => {
    expect(
      resolveManagerLlmOutput({
        outputKind: "questSuggestion",
        rawOutput: {
          questSuggestion: {
            title: "Draft one portfolio bullet",
            type: "quantity",
            amount: 1,
            unit: "bullet",
            difficulty: "normal",
            deadline: "today 23:59",
            rewardExp: 50,
          },
        },
        fallback,
      }),
    ).toEqual({
      ok: true,
      data: {
        questSuggestion: fallback.questSuggestion,
        source: "rule_fallback",
        fallbackReason: "INVALID_LLM_OUTPUT",
        promptVersion: managerLlmPromptVersion,
      },
    });
  });

  it("accepts a bounded monthly, weekly, daily, and milestone goal plan", () => {
    expect(
      resolveManagerLlmOutput({
        outputKind: "goalPlan",
        rawOutput: { goalPlan: fallback.goalPlan },
        fallback,
      }),
    ).toEqual({
      ok: true,
      data: {
        goalPlan: fallback.goalPlan,
        source: "llm",
        promptVersion: managerLlmPromptVersion,
      },
    });
  });

  it("accepts plan rebalancing only with a concrete next quest", () => {
    const nextQuest = {
      title: "Draft one smaller project bullet",
      type: "quantity",
      amount: 1,
      unit: "bullet",
      difficulty: "easy",
      deadline: "today 23:59",
      rewardExp: 8,
      linkedMilestoneId: "m1",
      recoveryReason: "shorten after time shortage",
    };

    expect(
      resolveManagerLlmOutput({
        outputKind: "planRebalance",
        rawOutput: {
          planRebalance: {
            ...fallback.planRebalance,
            nextQuest,
          },
        },
        fallback,
      }),
    ).toEqual({
      ok: true,
      data: {
        planRebalance: {
          ...fallback.planRebalance,
          nextQuest,
        },
        source: "llm",
        promptVersion: managerLlmPromptVersion,
      },
    });
  });

  it("falls back when the rebalanced next quest reward does not match difficulty", () => {
    const result = resolveManagerLlmOutput({
      outputKind: "planRebalance",
      rawOutput: {
        planRebalance: {
          ...fallback.planRebalance,
          nextQuest: {
            title: "Draft one smaller project bullet",
            type: "quantity",
            amount: 1,
            unit: "bullet",
            difficulty: "easy",
            deadline: "today 23:59",
            rewardExp: 40,
            linkedMilestoneId: "m1",
            recoveryReason: "shorten after time shortage",
          },
        },
      },
      fallback,
    });

    expect(result.data.source).toBe("rule_fallback");
    expect(result.data.fallbackReason).toBe("INVALID_LLM_OUTPUT");
  });

  it("falls back when a plan daily seed has reward outside its difficulty range", () => {
    const result = resolveManagerLlmOutput({
      outputKind: "goalPlan",
      rawOutput: {
        goalPlan: {
          ...fallback.goalPlan,
          dailySeeds: [
            {
              title: "Draft one project bullet",
              type: "quantity",
              amount: 1,
              unit: "bullet",
              difficulty: "normal",
              deadline: "today 23:59",
              rewardExp: 50,
              linkedMilestoneId: "m1",
            },
          ],
        },
      },
      fallback,
    });

    expect(result.data.source).toBe("rule_fallback");
    expect(result.data.fallbackReason).toBe("INVALID_LLM_OUTPUT");
  });

  it("accepts quest acceptance preview only when difficulty, exp, and stat budget agree", () => {
    expect(
      resolveManagerLlmOutput({
        outputKind: "questAcceptancePreview",
        rawOutput: { questAcceptancePreview: fallback.questAcceptancePreview },
        fallback,
      }).data,
    ).toMatchObject({
      questAcceptancePreview: fallback.questAcceptancePreview,
      source: "llm",
    });
  });
});
