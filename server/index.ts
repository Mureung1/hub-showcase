import { createApiApp } from "./app.js";
import type { ApiRuntimeInfo } from "./app.js";
import type { ManagerPlanStore } from "./lib/managerPlanStore.js";
import { createMemoryManagerPlanStore } from "./lib/managerPlanStore.js";
import { createMemoryQuestEventStore } from "./lib/questEventStore.js";
import type { QuestEventStore } from "./lib/questEventStore.js";
import { createManagerLlmRuntimeFromEnv } from "./lib/managerLlmProvider.js";
import { createSupabaseConfigFromEnv, createSupabaseManagerPlanStore, createSupabaseQuestEventStore } from "./lib/supabase.js";

export interface ServerEnv {
  get(name: string): string | undefined;
}

export function createServer(env: ServerEnv) {
  const runtime = createQuestEventStore(env);
  const app = createApiApp(runtime.store, {
    storageMode: runtime.storageMode,
    supabaseConfigured: runtime.supabaseConfigured,
  }, createManagerLlmRuntimeFromEnv((name) => env.get(name)?.trim()), runtime.managerPlanStore);
  return (request: Request) => app.fetch(request);
}

interface QuestEventStoreRuntime extends ApiRuntimeInfo {
  store: QuestEventStore;
  managerPlanStore: ManagerPlanStore;
}

function createQuestEventStore(env: ServerEnv): QuestEventStoreRuntime {
  const getSupabaseEnv = (name: string) => env.get(name)?.trim();
  const supabaseConfigured = Boolean(getSupabaseEnv("SUPABASE_URL") && getSupabaseEnv("SUPABASE_SERVICE_ROLE_KEY"));

  if (supabaseConfigured) {
    const config = createSupabaseConfigFromEnv(getSupabaseEnv);
    return {
      store: createSupabaseQuestEventStore(config),
      managerPlanStore: createSupabaseManagerPlanStore(config),
      storageMode: "supabase",
      supabaseConfigured,
    };
  }

  return {
    store: createMemoryQuestEventStore(),
    managerPlanStore: createMemoryManagerPlanStore(),
    storageMode: "memory",
    supabaseConfigured,
  };
}
