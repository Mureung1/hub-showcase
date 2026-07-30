import { Hono } from "hono";
import { registerManagerLlmRoutes, type ManagerLlmRuntime } from "./routes/managerLlm.js";
import { registerQuestEventRoutes } from "./routes/questEvents.js";
import type { QuestEventStore } from "./lib/questEventStore.js";
import type { ManagerPlanStore } from "./lib/managerPlanStore.js";

export type QuestEventStorageMode = "memory" | "supabase";

export interface ApiRuntimeInfo {
  storageMode: QuestEventStorageMode;
  supabaseConfigured: boolean;
}

const defaultRuntimeInfo: ApiRuntimeInfo = {
  storageMode: "memory",
  supabaseConfigured: false,
};

export function createApiApp(
  store: QuestEventStore,
  runtimeInfo: ApiRuntimeInfo = defaultRuntimeInfo,
  managerLlmRuntime: ManagerLlmRuntime = { enabled: false },
  managerPlanStore?: ManagerPlanStore,
) {
  const app = new Hono();

  app.get("/api/health", (context) => context.json({ ok: true, api: "hono", ...runtimeInfo }));
  registerQuestEventRoutes(app, store);
  registerManagerLlmRoutes(app, managerLlmRuntime, managerPlanStore);

  app.notFound((context) =>
    context.json({ ok: false, error: { code: "VALIDATION_ERROR", message: "Route not found." } }, 404),
  );

  return app;
}
