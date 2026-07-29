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
});
