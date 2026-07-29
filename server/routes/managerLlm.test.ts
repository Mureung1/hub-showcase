import { describe, expect, it } from "vitest";
import { createApiApp } from "../app";
import { managerLlmPromptVersion } from "../contracts/managerLlm";
import { createMemoryQuestEventStore } from "../lib/questEventStore";

function createRequestBody() {
  return {
    promptVersion: managerLlmPromptVersion,
    outputKind: "behaviorIntent",
    managerContext: {
      currentMood: "waiting",
      recentEventCount: 0,
      lastQuestResult: null,
      memorySummary: "no recent event",
      rewardHints: [],
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
      status: "draft",
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
    recentEvents: [],
  };
}

describe("manager LLM routes", () => {
  it("returns rule fallback when manager LLM is disabled", async () => {
    const app = createApiApp(createMemoryQuestEventStore(), undefined, { enabled: false });

    const response = await app.request("/api/manager/behavior-intent", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(createRequestBody()),
    });
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toMatchObject({
      ok: true,
      data: {
        source: "rule_fallback",
        fallbackReason: "LLM_DISABLED",
        promptVersion: managerLlmPromptVersion,
        behaviorIntent: {
          behaviorStyle: "balanced",
          tone: "friendly",
        },
      },
    });
  });

  it("returns a difficulty evaluation fallback route before quest acceptance", async () => {
    const app = createApiApp(createMemoryQuestEventStore(), undefined, { enabled: false });
    const body = { ...createRequestBody(), outputKind: "difficultyEvaluation" };

    const response = await app.request("/api/manager/difficulty-evaluation", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toMatchObject({
      ok: true,
      data: {
        source: "rule_fallback",
        fallbackReason: "LLM_DISABLED",
        promptVersion: managerLlmPromptVersion,
        difficultyEvaluation: {
          difficulty: "normal",
        },
      },
    });
  });
});
