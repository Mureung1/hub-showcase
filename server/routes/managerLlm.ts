import type { Hono } from "hono";
import {
  createFallbackOutput,
  parseManagerLlmRequest,
  resolveManagerLlmOutput,
  type ManagerLlmFallbackReason,
  type ManagerLlmOutputData,
  type ManagerLlmOutputKind,
  type ManagerLlmRequest,
} from "../contracts/managerLlm.js";
import { createErrorResponse, isApiErrorResponse } from "../contracts/questEvents.js";
import { createManagerLlmFallback } from "../lib/managerLlmFallback.js";
import type { ManagerPlanStore } from "../lib/managerPlanStore.js";

export interface ManagerLlmProvider {
  generate(request: ManagerLlmRequest): Promise<unknown>;
}

export interface ManagerLlmRateLimiter {
  check(outputKind: ManagerLlmOutputKind): { allowed: true } | { allowed: false };
}

export interface ManagerLlmRuntime {
  enabled: boolean;
  provider?: ManagerLlmProvider;
  rateLimiter?: ManagerLlmRateLimiter;
}

const routeKinds: Array<{ path: string; outputKind: ManagerLlmOutputKind }> = [
  { path: "/api/manager/line", outputKind: "managerLine" },
  { path: "/api/manager/quest-suggestion", outputKind: "questSuggestion" },
  { path: "/api/manager/difficulty-evaluation", outputKind: "difficultyEvaluation" },
  { path: "/api/manager/stat-evaluation", outputKind: "statEvaluation" },
  { path: "/api/manager/behavior-intent", outputKind: "behaviorIntent" },
  { path: "/api/manager/goal-plan", outputKind: "goalPlan" },
  { path: "/api/manager/plan-rebalance", outputKind: "planRebalance" },
  { path: "/api/manager/quest-acceptance-preview", outputKind: "questAcceptancePreview" },
];

export function registerManagerLlmRoutes(
  app: Hono,
  runtime: ManagerLlmRuntime = { enabled: false },
  planStore?: ManagerPlanStore,
) {
  for (const route of routeKinds) {
    app.post(route.path, async (context) => {
      let body: unknown;

      try {
        body = await context.req.json();
      } catch {
        return context.json(createErrorResponse("VALIDATION_ERROR", "Request body must be valid JSON."), 400);
      }

      const parsed = parseManagerLlmRequest(body);
      if (isApiErrorResponse(parsed)) return context.json(parsed, 400);
      if (parsed.data.outputKind !== route.outputKind) {
        return context.json(createErrorResponse("VALIDATION_ERROR", "outputKind does not match route.", { field: "outputKind" }), 400);
      }

      const fallback = createManagerLlmFallback(parsed.data);
      if (!runtime.enabled || !runtime.provider) {
        const output = createFallbackOutput(route.outputKind, fallback, "LLM_DISABLED");
        const persisted = await persistManagerPlanOutput(planStore, parsed.data, output);
        return context.json({
          ok: true,
          data: { ...output, ...persisted },
        });
      }

      if (runtime.rateLimiter?.check(route.outputKind).allowed === false) {
        const output = createFallbackOutput(route.outputKind, fallback, "RATE_LIMITED");
        const persisted = await persistManagerPlanOutput(planStore, parsed.data, output);
        return context.json({
          ok: true,
          data: { ...output, ...persisted },
        });
      }

      try {
        const rawOutput = await runtime.provider.generate(parsed.data);
        const response = resolveManagerLlmOutput({ outputKind: route.outputKind, rawOutput, fallback, request: parsed.data });
        const persisted = await persistManagerPlanOutput(planStore, parsed.data, response.data);
        response.data = { ...response.data, ...persisted };
        return context.json(response);
      } catch {
        const output = createFallbackOutput(route.outputKind, fallback, "LLM_PROVIDER_ERROR" satisfies ManagerLlmFallbackReason);
        const persisted = await persistManagerPlanOutput(planStore, parsed.data, output);
        return context.json({
          ok: true,
          data: { ...output, ...persisted },
        });
      }
    });
  }
}

async function persistManagerPlanOutput(
  planStore: ManagerPlanStore | undefined,
  request: ManagerLlmRequest,
  output: ManagerLlmOutputData,
): Promise<Pick<ManagerLlmOutputData, "storedPlanId" | "storedRevisionId">> {
  if (!planStore) return {};

  try {
    if (output.goalPlan) {
      const stored = await planStore.saveGoalPlan({
        goal: request.profile.goal,
        category: request.profile.category,
        source: output.source,
        fallbackReason: output.fallbackReason,
        promptVersion: output.promptVersion,
        plan: output.goalPlan,
      });
      return { storedPlanId: stored.id };
    }
    if (output.planRebalance) {
      const stored = await planStore.savePlanRevision({
        planId: request.activePlanId ?? null,
        goal: request.profile.goal,
        source: output.source,
        fallbackReason: output.fallbackReason,
        promptVersion: output.promptVersion,
        rebalance: output.planRebalance,
      });
      return { storedRevisionId: stored.id };
    }
  } catch {
    // Plan persistence must not break the manager flow.
  }
  return {};
}
