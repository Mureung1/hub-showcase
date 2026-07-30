import { describe, expect, it } from "vitest";
import {
  managerLlmPromptVersion,
  requestManagerLlmOutputViaApi,
  requestManagerBehaviorIntentViaApi,
  requestManagerDifficultyEvaluationViaApi,
  requestManagerGoalPlanViaApi,
  requestManagerLineViaApi,
  requestManagerPlanRebalanceViaApi,
  requestManagerQuestAcceptancePreviewViaApi,
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

  it("falls back locally instead of repeatedly calling the same output kind inside the client throttle window", async () => {
    const capturedUrls: string[] = [];
    const first = await requestManagerLlmOutputViaApi(
      { ...baseRequest, outputKind: "managerLine" },
      createFetchResponse({
        managerLine: "fresh line",
        source: "llm",
        promptVersion: managerLlmPromptVersion,
      }, capturedUrls),
      { nowMs: 10_000, throttleMs: 60_000 },
    );
    const second = await requestManagerLlmOutputViaApi(
      { ...baseRequest, outputKind: "managerLine" },
      createFetchResponse({
        managerLine: "should not call",
        source: "llm",
        promptVersion: managerLlmPromptVersion,
      }, capturedUrls),
      { nowMs: 20_000, throttleMs: 60_000 },
    );

    expect(first.source).toBe("llm");
    expect(second).toMatchObject({
      source: "rule_fallback",
      fallbackReason: "CLIENT_THROTTLED",
      managerLine: "fresh line",
    });
    expect(capturedUrls).toEqual(["/api/manager/line"]);
  });

  it("calls the goal plan and quest acceptance preview routes", async () => {
    const capturedUrls: string[] = [];
    await requestManagerGoalPlanViaApi(baseRequest, createFetchResponse({
      goalPlan: {
        goalSummary: "Build strength",
        horizon: "month",
        milestones: [{ id: "m1", title: "Base routine", targetWeek: 1, successCriteria: ["3 sessions"] }],
        monthlyPlan: [{ monthIndex: 1, focus: "Base", milestoneIds: ["m1"] }],
        weeklyPlan: [{ weekIndex: 1, focus: "Learn form", targetOutcome: "3 sessions", suggestedQuestThemes: ["squat form"] }],
        dailySeeds: [{ title: "Form video 10 min", type: "time", amount: 10, unit: "min", difficulty: "easy", rewardExp: 8, linkedMilestoneId: "m1" }],
        risks: ["fatigue"],
        rebalancingPolicy: {
          onSuccess: "add volume",
          onFailureTimeShortage: "shorten session",
          onFailureTooHard: "lower load",
          onSkippedDays: "restart easy",
        },
      },
      source: "llm",
      promptVersion: managerLlmPromptVersion,
    }, capturedUrls), { throttleMs: 0 });

    await requestManagerQuestAcceptancePreviewViaApi(baseRequest, createFetchResponse({
      questAcceptancePreview: {
        difficulty: "easy",
        rewardExp: 8,
        statEvaluation: {
          difficulty: "easy",
          statBudget: 3,
          primaryStats: ["diligence"],
          statDeltas: [{ stat: "diligence", amount: 3 }],
          reason: "short task",
        },
        reason: "short task",
      },
      source: "llm",
      promptVersion: managerLlmPromptVersion,
    }, capturedUrls), { throttleMs: 0 });

    expect(capturedUrls).toEqual(["/api/manager/goal-plan", "/api/manager/quest-acceptance-preview"]);
  });

  it("calls the plan rebalance route and returns the next quest", async () => {
    const capturedUrls: string[] = [];
    const result = await requestManagerPlanRebalanceViaApi(baseRequest, createFetchResponse({
      planRebalance: {
        rebalancedPlan: {
          goalSummary: "Build strength",
          horizon: "month",
          milestones: [{ id: "m1", title: "Base routine", targetWeek: 1, successCriteria: ["3 sessions"] }],
          monthlyPlan: [{ monthIndex: 1, focus: "Base", milestoneIds: ["m1"] }],
          weeklyPlan: [{ weekIndex: 1, focus: "Learn form", targetOutcome: "3 sessions", suggestedQuestThemes: ["squat form"] }],
          dailySeeds: [{ title: "Form video 10 min", type: "time", amount: 10, unit: "min", difficulty: "easy", deadline: "today 23:59", rewardExp: 8, linkedMilestoneId: "m1" }],
          risks: ["fatigue"],
          rebalancingPolicy: {
            onSuccess: "add volume",
            onFailureTimeShortage: "shorten session",
            onFailureTooHard: "lower load",
            onSkippedDays: "restart easy",
          },
        },
        changes: [{ scope: "daily", reason: "failure_too_hard", before: "45 min", after: "10 min" }],
        nextQuest: {
          title: "Practice squat setup 10 min",
          type: "time",
          amount: 10,
          unit: "min",
          difficulty: "easy",
          deadline: "today 23:59",
          rewardExp: 8,
          linkedMilestoneId: "m1",
          recoveryReason: "lowered after difficulty failure",
        },
      },
      source: "llm",
      promptVersion: managerLlmPromptVersion,
    }, capturedUrls), { throttleMs: 0 });

    expect(capturedUrls).toEqual(["/api/manager/plan-rebalance"]);
    expect(result.planRebalance.nextQuest).toMatchObject({
      title: "Practice squat setup 10 min",
      recoveryReason: "lowered after difficulty failure",
    });
  });
});
