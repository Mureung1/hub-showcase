import { managerLlmPromptVersion, type ManagerLlmOutputKind, type ManagerLlmRequest } from "../contracts/managerLlm";
import type { ManagerLlmProvider, ManagerLlmRateLimiter, ManagerLlmRuntime } from "../routes/managerLlm";

export const managerLlmEnvNames = {
  apiKey: "OPENAI_API_KEY",
  model: "OPENAI_MODEL",
  fallbackModel: "OPENAI_FALLBACK_MODEL",
  enabled: "LLM_MANAGER_ENABLED",
  minIntervalMs: "LLM_MANAGER_MIN_INTERVAL_MS",
  dailyLimit: "LLM_MANAGER_DAILY_LIMIT",
} as const;

export interface OpenAiManagerLlmConfig {
  apiKey: string;
  model: string;
  fallbackModel: string;
}

const defaultModel = "gpt-5-nano";
const defaultFallbackModel = "gpt-5-mini";
const defaultMinIntervalMs = 30_000;
const defaultDailyLimit = 80;

export function createManagerLlmRuntimeFromEnv(
  getEnv: (name: string) => string | undefined,
  fetchFn: typeof fetch = fetch,
): ManagerLlmRuntime {
  const apiKey = getEnv(managerLlmEnvNames.apiKey)?.trim();
  const explicitlyEnabled = getEnv(managerLlmEnvNames.enabled)?.trim().toLowerCase() === "true";

  if (!explicitlyEnabled || !apiKey) return { enabled: false };

  return {
    enabled: true,
    provider: createOpenAiManagerLlmProvider({
      apiKey,
      model: getEnv(managerLlmEnvNames.model)?.trim() || defaultModel,
      fallbackModel: getEnv(managerLlmEnvNames.fallbackModel)?.trim() || defaultFallbackModel,
    }, fetchFn),
    rateLimiter: createInMemoryManagerLlmRateLimiter({
      minIntervalMs: readPositiveInteger(getEnv(managerLlmEnvNames.minIntervalMs), defaultMinIntervalMs),
      dailyLimit: readPositiveInteger(getEnv(managerLlmEnvNames.dailyLimit), defaultDailyLimit),
    }),
  };
}

export function createOpenAiManagerLlmProvider(
  config: OpenAiManagerLlmConfig,
  fetchFn: typeof fetch = fetch,
): ManagerLlmProvider {
  return {
    async generate(request) {
      const response = await fetchFn("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          authorization: `Bearer ${config.apiKey}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          model: config.model,
          messages: [
            {
              role: "system",
              content: createSystemPrompt(request.outputKind),
            },
            {
              role: "user",
              content: JSON.stringify(toPromptInput(request)),
            },
          ],
          tools: [
            {
              type: "function",
              function: {
                name: "emit_manager_result",
                description: "Return the requested electronic manager output using only the provided schema.",
                strict: true,
                parameters: createOutputSchema(request.outputKind),
              },
            },
          ],
          tool_choice: { type: "function", function: { name: "emit_manager_result" } },
          parallel_tool_calls: false,
        }),
      });

      if (!response.ok) throw new Error(`OpenAI request failed: ${response.status}`);
      return parseOpenAiToolArguments(await response.json());
    },
  };
}

export function createInMemoryManagerLlmRateLimiter(input: {
  minIntervalMs: number;
  dailyLimit: number;
  now?: () => Date;
}): ManagerLlmRateLimiter {
  const now = input.now ?? (() => new Date());
  let dayKey = "";
  let callsToday = 0;
  const lastCallAtByKind: Partial<Record<ManagerLlmOutputKind, number>> = {};

  return {
    check(outputKind) {
      const current = now();
      const currentDayKey = current.toISOString().slice(0, 10);
      if (currentDayKey !== dayKey) {
        dayKey = currentDayKey;
        callsToday = 0;
        for (const key of Object.keys(lastCallAtByKind) as ManagerLlmOutputKind[]) {
          delete lastCallAtByKind[key];
        }
      }

      const currentTime = current.getTime();
      const lastCallAt = lastCallAtByKind[outputKind] ?? 0;
      if (callsToday >= input.dailyLimit) return { allowed: false };
      if (lastCallAt > 0 && currentTime - lastCallAt < input.minIntervalMs) return { allowed: false };

      callsToday += 1;
      lastCallAtByKind[outputKind] = currentTime;
      return { allowed: true };
    },
  };
}

function createSystemPrompt(outputKind: ManagerLlmOutputKind): string {
  return [
    `You are the server-side electronic manager model for ${managerLlmPromptVersion}.`,
    "Return only the required tool call. Never mention API keys, tokens, database credentials, files, DOM, sprite paths, or hidden implementation details.",
    "Use short, gentle Korean suitable for an XP desktop pet manager. Do not blame the user for failure.",
    `Requested output kind: ${outputKind}.`,
  ].join("\n");
}

function toPromptInput(request: ManagerLlmRequest) {
  return {
    promptVersion: request.promptVersion,
    outputKind: request.outputKind,
    managerContext: request.managerContext,
    profile: request.profile,
    persona: request.persona,
    questState: request.questState,
    recentEvents: request.recentEvents.slice(0, 10),
  };
}

function createOutputSchema(outputKind: ManagerLlmOutputKind) {
  if (outputKind === "managerLine") {
    return {
      type: "object",
      additionalProperties: false,
      required: ["managerLine"],
      properties: {
        managerLine: { type: "string", description: "A short Korean manager line, max 180 characters." },
      },
    };
  }

  if (outputKind === "behaviorIntent") {
    return {
      type: "object",
      additionalProperties: false,
      required: ["behaviorIntent"],
      properties: {
        behaviorIntent: {
          type: "object",
          additionalProperties: false,
          required: ["behaviorStyle", "tone", "line", "suggestedBehaviorBias"],
          properties: {
            behaviorStyle: { type: "string", enum: ["balanced", "adventurous", "shy"] },
            tone: { type: "string", enum: ["calm", "friendly", "firm"] },
            line: { type: "string" },
            suggestedBehaviorBias: {
              type: "array",
              items: {
                type: "object",
                additionalProperties: false,
                required: ["state", "weightDelta", "reason"],
                properties: {
                  state: {
                    type: "string",
                    enum: [
                      "idle",
                      "wander",
                      "approach_ladder",
                      "climb_ladder",
                      "approach_platform",
                      "jump_to_platform",
                      "hide_behind_window",
                      "hang_on_window",
                      "escape_window",
                      "rest",
                    ],
                  },
                  weightDelta: { type: "integer", minimum: -2, maximum: 2 },
                  reason: { type: "string" },
                },
              },
            },
          },
        },
      },
    };
  }

  if (outputKind === "statEvaluation") {
    return {
      type: "object",
      additionalProperties: false,
      required: ["statEvaluation"],
      properties: {
        statEvaluation: {
          type: "object",
          additionalProperties: false,
          required: ["difficulty", "statBudget", "primaryStats", "statDeltas", "reason"],
          properties: {
            difficulty: { type: "string", enum: ["easy", "normal", "hard"] },
            statBudget: { type: "integer", enum: [3, 7, 15] },
            primaryStats: {
              type: "array",
              items: { type: "string", enum: ["diligence", "persistence", "creativity", "knowledge", "strength", "agility", "stamina", "charm"] },
            },
            statDeltas: {
              type: "array",
              items: {
                type: "object",
                additionalProperties: false,
                required: ["stat", "amount"],
                properties: {
                  stat: { type: "string", enum: ["diligence", "persistence", "creativity", "knowledge", "strength", "agility", "stamina", "charm"] },
                  amount: { type: "integer", minimum: 1 },
                },
              },
            },
            reason: { type: "string" },
          },
        },
      },
    };
  }

  if (outputKind === "difficultyEvaluation") {
    return {
      type: "object",
      additionalProperties: false,
      required: ["difficultyEvaluation"],
      properties: {
        difficultyEvaluation: {
          type: "object",
          additionalProperties: false,
          required: ["difficulty", "rewardExp", "reason"],
          properties: {
            difficulty: { type: "string", enum: ["easy", "normal", "hard"] },
            rewardExp: {
              type: "integer",
              minimum: 5,
              maximum: 60,
              description: "Must match difficulty: easy 5-15, normal 16-35, hard 36-60.",
            },
            reason: { type: "string" },
          },
        },
      },
    };
  }

  return {
    type: "object",
    additionalProperties: false,
    required: ["questSuggestion"],
    properties: {
      questSuggestion: {
        type: "object",
        additionalProperties: false,
        required: ["title", "type", "amount", "unit", "difficulty", "deadline", "rewardExp"],
        properties: {
          title: { type: "string" },
          type: { type: "string", enum: ["time", "quantity", "action"] },
          amount: { type: "integer", minimum: 1 },
          unit: { type: "string" },
          difficulty: { type: "string", enum: ["easy", "normal", "hard"] },
          deadline: { type: "string" },
          rewardExp: { type: "integer", minimum: 0 },
        },
      },
    },
  };
}

function parseOpenAiToolArguments(value: unknown): unknown {
  const choice = getArray(getRecord(value)?.choices)[0];
  const message = getRecord(getRecord(choice)?.message);
  const toolCall = getArray(message?.tool_calls)[0];
  const functionCall = getRecord(getRecord(toolCall)?.function);
  const argumentText = typeof functionCall?.arguments === "string" ? functionCall.arguments : null;
  if (argumentText) return JSON.parse(argumentText) as unknown;

  const content = typeof message?.content === "string" ? message.content : null;
  if (content) return JSON.parse(content) as unknown;
  throw new Error("OpenAI response did not include tool arguments.");
}

function getRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

function getArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function readPositiveInteger(value: string | undefined, fallback: number): number {
  if (!value) return fallback;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}
