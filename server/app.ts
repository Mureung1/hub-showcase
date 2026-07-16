import { Hono } from "hono";
import { registerQuestEventRoutes } from "./routes/questEvents";
import type { QuestEventStore } from "./lib/questEventStore";

export type QuestEventStorageMode = "memory" | "supabase";

export interface ApiRuntimeInfo {
  storageMode: QuestEventStorageMode;
  supabaseConfigured: boolean;
}

const defaultRuntimeInfo: ApiRuntimeInfo = {
  storageMode: "memory",
  supabaseConfigured: false,
};

export function createApiApp(store: QuestEventStore, runtimeInfo: ApiRuntimeInfo = defaultRuntimeInfo) {
  const app = new Hono();

  app.get("/api/health", (context) => context.json({ ok: true, api: "hono", ...runtimeInfo }));
  registerQuestEventRoutes(app, store);

  app.notFound((context) =>
    context.json({ ok: false, error: { code: "VALIDATION_ERROR", message: "Route not found." } }, 404),
  );

  return app;
}
