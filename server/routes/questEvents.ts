import type { Hono } from "hono";
import {
  createErrorResponse,
  isApiErrorResponse,
  parseCreateQuestEventRequest,
  parseGetQuestEventsQuery,
  toQuestEventResponseItem,
} from "../contracts/questEvents";
import type {
  ApiResponse,
  CreateQuestEventResponse,
  GetQuestEventsResponse,
  ManagerContextResponse,
} from "../contracts/questEvents";
import type { QuestEventStore } from "../lib/questEventStore";

export function registerQuestEventRoutes(app: Hono, store: QuestEventStore) {
  app.post("/api/quest-events", async (context) => {
    let body: unknown;

    try {
      body = await context.req.json();
    } catch {
      return context.json(createErrorResponse("VALIDATION_ERROR", "Request body must be valid JSON."), 400);
    }

    const parsed = parseCreateQuestEventRequest(body);
    if (isApiErrorResponse(parsed)) return context.json(parsed, 400);

    try {
      const record = await store.insertQuestEvent(parsed);
      const managerContext = await store.getManagerContext();
      return context.json<ApiResponse<CreateQuestEventResponse>>(
        { ok: true, data: toQuestEventResponseItem(record), managerContext },
        201,
      );
    } catch {
      return context.json(createErrorResponse("DB_INSERT_FAILED", "Failed to save quest event."), 500);
    }
  });

  app.get("/api/quest-events", async (context) => {
    const parsed = parseGetQuestEventsQuery(new URL(context.req.url));
    if (isApiErrorResponse(parsed)) return context.json(parsed, 400);

    try {
      const result = await store.listQuestEvents(parsed);
      return context.json<ApiResponse<GetQuestEventsResponse>>({
        ok: true,
        data: result.records.map(toQuestEventResponseItem),
        page: { nextCursor: result.nextCursor },
      });
    } catch {
      return context.json(createErrorResponse("DB_SELECT_FAILED", "Failed to load quest events."), 500);
    }
  });

  app.get("/api/manager-context", async (context) => {
    try {
      return context.json<ApiResponse<ManagerContextResponse>>({ ok: true, data: await store.getManagerContext() });
    } catch {
      return context.json(createErrorResponse("DB_SELECT_FAILED", "Failed to load manager context."), 500);
    }
  });
}
