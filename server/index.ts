import { createApiApp } from "./app";
import type { ApiRuntimeInfo } from "./app";
import { createMemoryQuestEventStore } from "./lib/questEventStore";
import type { QuestEventStore } from "./lib/questEventStore";
import { createManagerLlmRuntimeFromEnv } from "./lib/managerLlmProvider";
import { createSupabaseConfigFromEnv, createSupabaseQuestEventStore } from "./lib/supabase";

export interface ServerEnv {
  get(name: string): string | undefined;
}

export function createServer(env: ServerEnv) {
  const runtime = createQuestEventStore(env);
  const app = createApiApp(runtime.store, {
    storageMode: runtime.storageMode,
    supabaseConfigured: runtime.supabaseConfigured,
  }, createManagerLlmRuntimeFromEnv((name) => env.get(name)?.trim()));
  return (request: Request) => app.fetch(request);
}

interface QuestEventStoreRuntime extends ApiRuntimeInfo {
  store: QuestEventStore;
}

function createQuestEventStore(env: ServerEnv): QuestEventStoreRuntime {
  const getSupabaseEnv = (name: string) => env.get(name)?.trim();
  const supabaseConfigured = Boolean(getSupabaseEnv("SUPABASE_URL") && getSupabaseEnv("SUPABASE_SERVICE_ROLE_KEY"));

  if (supabaseConfigured) {
    return {
      store: createSupabaseQuestEventStore(createSupabaseConfigFromEnv(getSupabaseEnv)),
      storageMode: "supabase",
      supabaseConfigured,
    };
  }

  return {
    store: createMemoryQuestEventStore(),
    storageMode: "memory",
    supabaseConfigured,
  };
}
