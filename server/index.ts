import { createSupabaseConfigFromEnv, createSupabaseQuestLogStore } from "./lib/supabase";
import { createQuestLogsHandler } from "./routes/questLogs";

export interface ServerEnv {
  get(name: string): string | undefined;
}

export function createServer(env: ServerEnv) {
  const config = createSupabaseConfigFromEnv((name) => env.get(name));
  const questLogStore = createSupabaseQuestLogStore(config);
  const handleQuestLogs = createQuestLogsHandler(questLogStore);

  return async function handleRequest(request: Request): Promise<Response> {
    const url = new URL(request.url);

    if (request.method === "GET" && url.pathname === "/api/health") {
      return new Response(JSON.stringify({ ok: true }), {
        headers: { "content-type": "application/json; charset=utf-8" },
      });
    }

    if (url.pathname === "/api/quest-logs") {
      return handleQuestLogs(request);
    }

    return new Response(JSON.stringify({ ok: false, error: { code: "VALIDATION_ERROR", message: "Route not found." } }), {
      status: 404,
      headers: { "content-type": "application/json; charset=utf-8" },
    });
  };
}
