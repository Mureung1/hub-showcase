import { describe, expect, it } from "vitest";
import {
  managerLlmPromptVersion,
  requestManagerBehaviorIntentViaApi,
  requestManagerDifficultyEvaluationViaApi,
  requestManagerLineViaApi,
  requestManagerQuestSuggestionViaApi,
  requestManagerStatEvaluationViaApi,
  type ManagerLlmRequest,
} from "./managerLlmApi";

const baseRequest: ManagerLlmRequest = {
  promptVersion: managerLlmPromptVersion,
  outputKind: "behaviorIntent",
  managerContext: {
    currentMood: "waiting",
    recentEventCount: 0,
    lastQuestResult: null,
    memorySummary: "no events",
    rewardHints: [],
  },
  profile: {
    nickname: "tester",
    goal: "certification study",
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
  questState: { status: "draft" },
  recentEvents: [],
};

function createFetchResponse(data: Record<string, unknown>, capture: string[]) {
  const fetchFn: typeof fetch = async (url) => {
    capture.push(String(url));
    return new Response(JSON.stringify({ ok: true, data }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  };
  return fetchFn;
}

describe("manager LLM API client", () => {
  it("calls the server behavior intent route instead of a provider URL", async () => {
    const capturedUrls: string[] = [];
    const result = await requestManagerBehaviorIntentViaApi(baseRequest, createFetchResponse({
      behaviorIntent: {
        behaviorStyle: "balanced",
        tone: "friendly",
        line: "server line",
        suggestedBehaviorBias: [],
      },
      source: "llm",
      promptVersion: managerLlmPromptVersion,
    }, capturedUrls));

    expect(capturedUrls).toEqual(["/api/manager/behavior-intent"]);
    expect(result.behaviorIntent.line).toBe("server line");
    expect(result.source).toBe("llm");
  });

  it("has typed helpers for all manager LLM output routes", async () => {
    const capturedUrls: string[] = [];

    await requestManagerLineViaApi(baseRequest, createFetchResponse({
      managerLine: "line",
      source: "llm",
      promptVersion: managerLlmPromptVersion,
    }, capturedUrls));
    await requestManagerQuestSuggestionViaApi(baseRequest, createFetchResponse({
      questSuggestion: {
        title: "Study 15 min",
        type: "time",
        amount: 15,
        unit: "min",
        difficulty: "normal",
        deadline: "today 23:59",
        rewardExp: 16,
      },
      source: "llm",
      promptVersion: managerLlmPromptVersion,
    }, capturedUrls));
    await requestManagerStatEvaluationViaApi(baseRequest, createFetchResponse({
      statEvaluation: {
        difficulty: "normal",
        statBudget: 7,
        primaryStats: ["knowledge"],
        statDeltas: [
          { stat: "knowledge", amount: 5 },
          { stat: "diligence", amount: 2 },
        ],
        reason: "study quest",
      },
      source: "llm",
      promptVersion: managerLlmPromptVersion,
    }, capturedUrls));
    await requestManagerDifficultyEvaluationViaApi(baseRequest, createFetchResponse({
      difficultyEvaluation: {
        difficulty: "hard",
        rewardExp: 40,
        reason: "large edited quest",
      },
      source: "llm",
      promptVersion: managerLlmPromptVersion,
    }, capturedUrls));

    expect(capturedUrls).toEqual([
      "/api/manager/line",
      "/api/manager/quest-suggestion",
      "/api/manager/stat-evaluation",
      "/api/manager/difficulty-evaluation",
    ]);
  });
});
