import {
  createErrorResponse,
  isApiErrorResponse,
  parseCreateQuestLogRequest,
  parseGetQuestLogsQuery,
  toQuestLogResponseItem,
} from "../contracts/questLogs";
import type {
  ApiResponse,
  CreateQuestLogResponse,
  GetQuestLogsResponse,
} from "../contracts/questLogs";
import type { QuestLogStore } from "../lib/supabase";

export function createQuestLogsHandler(store: QuestLogStore) {
  return async function handleQuestLogs(request: Request): Promise<Response> {
    const url = new URL(request.url);

    if (request.method === "POST" && url.pathname === "/api/quest-logs") {
      return handleCreateQuestLog(request, store);
    }

    if (request.method === "GET" && url.pathname === "/api/quest-logs") {
      return handleGetQuestLogs(url, store);
    }

    return json(createErrorResponse("VALIDATION_ERROR", "Unsupported quest_logs route."), 404);
  };
}

async function handleCreateQuestLog(request: Request, store: QuestLogStore) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return json(createErrorResponse("VALIDATION_ERROR", "Request body must be valid JSON."), 400);
  }

  const parsed = parseCreateQuestLogRequest(body);
  if (isApiErrorResponse(parsed)) return json(parsed, 400);

  try {
    const record = await store.insertQuestLog(parsed);
    return json<ApiResponse<CreateQuestLogResponse>>({ ok: true, data: toQuestLogResponseItem(record) }, 201);
  } catch {
    return json(createErrorResponse("DB_INSERT_FAILED", "Failed to save quest log."), 500);
  }
}

async function handleGetQuestLogs(url: URL, store: QuestLogStore) {
  const parsed = parseGetQuestLogsQuery(url);
  if (isApiErrorResponse(parsed)) return json(parsed, 400);

  try {
    const result = await store.listQuestLogs(parsed);
    return json<ApiResponse<GetQuestLogsResponse>>({
      ok: true,
      data: result.records.map(toQuestLogResponseItem),
      page: { nextCursor: result.nextCursor },
    });
  } catch {
    return json(createErrorResponse("DB_SELECT_FAILED", "Failed to load quest logs."), 500);
  }
}

function json<T>(payload: T, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}
