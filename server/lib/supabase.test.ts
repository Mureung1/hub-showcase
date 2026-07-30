import { describe, expect, it } from "vitest";
import { createSupabaseManagerPlanStore } from "./supabase";

describe("supabase manager plan store", () => {
  it("inserts manager goal plans and revisions into dedicated tables", async () => {
    const calls: Array<{ url: string; body: Record<string, unknown> }> = [];
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async (input, init) => {
      calls.push({
        url: String(input),
        body: JSON.parse(String(init?.body)) as Record<string, unknown>,
      });
      return new Response(JSON.stringify([{ id: "row-1", created_at: "2026-07-30T00:00:00.000Z" }]), {
        status: 201,
        headers: { "content-type": "application/json" },
      });
    }) as typeof fetch;

    try {
      const store = createSupabaseManagerPlanStore({ url: "https://example.supabase.co", serviceRoleKey: "test-key" });
      await store.saveGoalPlan({
        goal: "Build strength",
        category: "exercise",
        source: "llm",
        promptVersion: "manager-api-v1",
        plan: {
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
      });
      await store.savePlanRevision({
        planId: "row-1",
        goal: "Build strength",
        source: "rule_fallback",
        fallbackReason: "LLM_DISABLED",
        promptVersion: "manager-api-v1",
        rebalance: {
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
          changes: [{ scope: "daily", reason: "failure_time_shortage", before: "20 min", after: "10 min" }],
          nextQuest: {
            title: "Form video 10 min",
            type: "time",
            amount: 10,
            unit: "min",
            difficulty: "easy",
            deadline: "today 23:59",
            rewardExp: 8,
            linkedMilestoneId: "m1",
            recoveryReason: "shorten after time shortage",
          },
        },
      });
    } finally {
      globalThis.fetch = originalFetch;
    }

    expect(calls.map((call) => call.url)).toEqual([
      "https://example.supabase.co/rest/v1/manager_goal_plans",
      "https://example.supabase.co/rest/v1/manager_plan_revisions",
    ]);
    expect(calls[0]?.body).toMatchObject({
      goal: "Build strength",
      category: "exercise",
      source: "llm",
      prompt_version: "manager-api-v1",
    });
    expect(calls[1]?.body).toMatchObject({
      plan_id: "row-1",
      source: "rule_fallback",
      fallback_reason: "LLM_DISABLED",
      next_quest_json: {
        title: "Form video 10 min",
        recoveryReason: "shorten after time shortage",
      },
    });
  });
});
