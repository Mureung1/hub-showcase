import { describe, expect, it } from "vitest";
import { managerLlmPromptVersion, type ManagerLlmRequest } from "../contracts/managerLlm";
import { createInMemoryManagerLlmRateLimiter, createManagerLlmRuntimeFromEnv, managerLlmEnvNames } from "./managerLlmProvider";

const request: ManagerLlmRequest = {
  promptVersion: managerLlmPromptVersion,
  outputKind: "managerLine",
  managerContext: {
    currentMood: "waiting",
    recentEventCount: 0,
    lastQuestResult: null,
    memorySummary: "no events",
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
  questState: { status: "draft" },
  recentEvents: [],
};

describe("manager LLM provider", () => {
  it("stays disabled when the OpenAI key is missing", () => {
    const runtime = createManagerLlmRuntimeFromEnv((name) => (name === managerLlmEnvNames.enabled ? "true" : undefined));

    expect(runtime.enabled).toBe(false);
    expect(runtime.provider).toBeUndefined();
  });

  it("uses gpt-5-nano by default and extracts strict tool arguments", async () => {
    let capturedBody: unknown;
    const fetchFn: typeof fetch = async (_url, init) => {
      capturedBody = init?.body ? JSON.parse(String(init.body)) : null;
      return new Response(
        JSON.stringify({
          choices: [
            {
              message: {
                tool_calls: [
                  {
                    function: {
                      arguments: JSON.stringify({ managerLine: "작게 시작해보자." }),
                    },
                  },
                ],
              },
            },
          ],
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      );
    };
    const runtime = createManagerLlmRuntimeFromEnv(
      (name) => {
        if (name === managerLlmEnvNames.enabled) return "true";
        if (name === managerLlmEnvNames.apiKey) return "test-key";
        return undefined;
      },
      fetchFn,
    );

    const output = await runtime.provider?.generate(request);

    expect(runtime.enabled).toBe(true);
    expect(output).toEqual({ managerLine: "작게 시작해보자." });
    expect(capturedBody).toMatchObject({
      model: "gpt-5-nano",
      tool_choice: { type: "function", function: { name: "emit_manager_result" } },
      tools: [
        {
          type: "function",
          function: {
            name: "emit_manager_result",
            strict: true,
          },
        },
      ],
    });
  });

  it("sends a strict difficulty evaluation schema when requested", async () => {
    let capturedBody: unknown;
    const fetchFn: typeof fetch = async (_url, init) => {
      capturedBody = init?.body ? JSON.parse(String(init.body)) : null;
      return new Response(
        JSON.stringify({
          choices: [
            {
              message: {
                tool_calls: [
                  {
                    function: {
                      arguments: JSON.stringify({
                        difficultyEvaluation: {
                          difficulty: "hard",
                          rewardExp: 40,
                          reason: "large edited quest",
                        },
                      }),
                    },
                  },
                ],
              },
            },
          ],
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      );
    };
    const runtime = createManagerLlmRuntimeFromEnv(
      (name) => {
        if (name === managerLlmEnvNames.enabled) return "true";
        if (name === managerLlmEnvNames.apiKey) return "test-key";
        return undefined;
      },
      fetchFn,
    );

    const output = await runtime.provider?.generate({ ...request, outputKind: "difficultyEvaluation" });

    expect(output).toEqual({
      difficultyEvaluation: {
        difficulty: "hard",
        rewardExp: 40,
        reason: "large edited quest",
      },
    });
    expect(capturedBody).toMatchObject({
      tools: [
        {
          function: {
            parameters: {
              required: ["difficultyEvaluation"],
            },
          },
        },
      ],
    });
  });

  it("instructs quest suggestions to decompose the long-term goal into a small next action", async () => {
    let capturedBody: unknown;
    const fetchFn: typeof fetch = async (_url, init) => {
      capturedBody = init?.body ? JSON.parse(String(init.body)) : null;
      return new Response(
        JSON.stringify({
          choices: [
            {
              message: {
                tool_calls: [
                  {
                    function: {
                      arguments: JSON.stringify({
                        questSuggestion: {
                          title: "Read DB index cards for 15 min",
                          type: "time",
                          amount: 15,
                          unit: "min",
                          difficulty: "normal",
                          deadline: "today 23:59",
                          rewardExp: 20,
                        },
                      }),
                    },
                  },
                ],
              },
            },
          ],
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      );
    };
    const runtime = createManagerLlmRuntimeFromEnv(
      (name) => {
        if (name === managerLlmEnvNames.enabled) return "true";
        if (name === managerLlmEnvNames.apiKey) return "test-key";
        return undefined;
      },
      fetchFn,
    );

    await runtime.provider?.generate({ ...request, outputKind: "questSuggestion" });

    const messages = (capturedBody as { messages: Array<{ content: string }> }).messages.map((message) => message.content).join("\n");
    expect(messages).toContain("Decompose the long-term goal");
    expect(messages).toContain("Do not copy the goal verbatim");
    expect(messages).toContain("tiny next action");
    expect(messages).toContain("Quest size policy");
    expect(messages).toContain("Difficulty policy");
  });

  it("sends a strict goal plan schema with plan-specific instructions", async () => {
    let capturedBody: unknown;
    const fetchFn: typeof fetch = async (_url, init) => {
      capturedBody = init?.body ? JSON.parse(String(init.body)) : null;
      return new Response(
        JSON.stringify({
          choices: [
            {
              message: {
                tool_calls: [
                  {
                    function: {
                      arguments: JSON.stringify({
                        goalPlan: {
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
                      }),
                    },
                  },
                ],
              },
            },
          ],
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      );
    };
    const runtime = createManagerLlmRuntimeFromEnv(
      (name) => {
        if (name === managerLlmEnvNames.enabled) return "true";
        if (name === managerLlmEnvNames.apiKey) return "test-key";
        return undefined;
      },
      fetchFn,
    );

    await runtime.provider?.generate({ ...request, outputKind: "goalPlan" });

    const body = capturedBody as {
      messages: Array<{ content: string }>;
      tools: Array<{ function: { parameters: { required: string[] } } }>;
    };
    const messages = body.messages.map((message) => message.content).join("\n");
    expect(messages).toContain("monthly, weekly, daily, and milestone plan");
    expect(body.tools[0]?.function.parameters.required).toEqual(["goalPlan"]);
    expect(capturedBody).toMatchObject({ model: "gpt-5-mini" });
  });

  it("requires plan rebalancing to return the next visible quest", async () => {
    let capturedBody: unknown;
    const fetchFn: typeof fetch = async (_url, init) => {
      capturedBody = init?.body ? JSON.parse(String(init.body)) : null;
      return new Response(
        JSON.stringify({
          choices: [
            {
              message: {
                tool_calls: [
                  {
                    function: {
                      arguments: JSON.stringify({
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
                      }),
                    },
                  },
                ],
              },
            },
          ],
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      );
    };
    const runtime = createManagerLlmRuntimeFromEnv(
      (name) => {
        if (name === managerLlmEnvNames.enabled) return "true";
        if (name === managerLlmEnvNames.apiKey) return "test-key";
        return undefined;
      },
      fetchFn,
    );

    await runtime.provider?.generate({ ...request, outputKind: "planRebalance" });

    const body = capturedBody as {
      messages: Array<{ content: string }>;
      tools: Array<{ function: { parameters: { properties: { planRebalance: { required: string[] } } } } }>;
    };
    const messages = body.messages.map((message) => message.content).join("\n");
    expect(messages).toContain("Return nextQuest");
    expect(messages).toContain("UI should show only nextQuest");
    expect(body.tools[0]?.function.parameters.properties.planRebalance.required).toContain("nextQuest");
    expect(capturedBody).toMatchObject({ model: "gpt-5-mini" });
  });

  it("applies the minimum interval per output kind", () => {
    const now = new Date("2026-07-29T00:00:00.000Z");
    const limiter = createInMemoryManagerLlmRateLimiter({
      minIntervalMs: 30_000,
      dailyLimit: 10,
      now: () => now,
    });

    expect(limiter.check("managerLine").allowed).toBe(true);
    expect(limiter.check("managerLine").allowed).toBe(false);
    expect(limiter.check("behaviorIntent").allowed).toBe(true);
  });
});
