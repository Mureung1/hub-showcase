import type { Hono } from "hono";
import {
  createFallbackOutput,
  parseManagerLlmRequest,
  resolveManagerLlmOutput,
  type ManagerLlmFallbackReason,
  type ManagerLlmOutputKind,
  type ManagerLlmRequest,
} from "../contracts/managerLlm";
import { createErrorResponse, isApiErrorResponse } from "../contracts/questEvents";
import { createManagerLlmFallback } from "../lib/managerLlmFallback";

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
];

export function registerManagerLlmRoutes(app: Hono, runtime: ManagerLlmRuntime = { enabled: false }) {
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
        return context.json({
          ok: true,
          data: createFallbackOutput(route.outputKind, fallback, "LLM_DISABLED"),
        });
      }

      if (runtime.rateLimiter?.check(route.outputKind).allowed === false) {
        return context.json({
          ok: true,
          data: createFallbackOutput(route.outputKind, fallback, "RATE_LIMITED"),
        });
      }

      try {
        const rawOutput = await runtime.provider.generate(parsed.data);
        return context.json(resolveManagerLlmOutput({ outputKind: route.outputKind, rawOutput, fallback, request: parsed.data }));
      } catch {
        return context.json({
          ok: true,
          data: createFallbackOutput(route.outputKind, fallback, "LLM_PROVIDER_ERROR" satisfies ManagerLlmFallbackReason),
        });
      }
    });
  }
}
