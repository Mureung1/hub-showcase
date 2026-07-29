import { describe, expect, it } from "vitest";
import { managerLlmPromptVersion, type ManagerLlmRequest } from "../contracts/managerLlm";
import { createManagerLlmFallback } from "./managerLlmFallback";

const baseRequest: ManagerLlmRequest = {
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
};

describe("manager LLM fallback", () => {
  it("suggests a small next action instead of copying the long-term goal as the quest title", () => {
    const fallback = createManagerLlmFallback(baseRequest);

    expect(fallback.questSuggestion?.title).not.toContain(baseRequest.profile.goal);
    expect(fallback.questSuggestion).toMatchObject({
      type: "time",
      amount: 15,
      difficulty: "normal",
      rewardExp: 16,
    });
  });
});
