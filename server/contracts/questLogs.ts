export type QuestLogResult = "success" | "failed" | "recovery";
export type QuestType = "time" | "quantity" | "action";
export type QuestDifficulty = "easy" | "normal" | "hard";
export type QuestLogVisibility = "private" | "anonymous_public" | "friends_only";
export type ManagerMood = "waiting" | "focused" | "happy" | "recovering";

export interface QuestLogQuestInput {
  title: string;
  type: QuestType;
  amount: number;
  unit: string;
  difficulty: QuestDifficulty;
  deadlineAt?: string | null;
}

export interface CreateQuestLogRequest {
  quest: QuestLogQuestInput;
  result: QuestLogResult;
  expDelta: number;
  failureReason?: string | null;
  previousQuestTitle?: string | null;
  recoveryFromLogId?: string | null;
  managerMoodAfter?: ManagerMood | null;
  clientCreatedAt?: string | null;
  metadata?: Record<string, unknown>;
}

export interface QuestLogResponseItem {
  id: string;
  title: string;
  result: QuestLogResult;
  expDelta: number;
  failureReason: string | null;
  createdAt: string;
}

export interface CreateQuestLogResponse {
  ok: true;
  data: QuestLogResponseItem;
}

export interface GetQuestLogsQuery {
  limit: number;
  cursor?: string;
  result?: QuestLogResult;
}

export interface GetQuestLogsResponse {
  ok: true;
  data: QuestLogResponseItem[];
  page: {
    nextCursor: string | null;
  };
}

export type ApiErrorCode =
  | "VALIDATION_ERROR"
  | "DB_INSERT_FAILED"
  | "DB_SELECT_FAILED"
  | "UNAUTHORIZED"
  | "RATE_LIMITED"
  | "INTERNAL_ERROR";

export interface ApiErrorResponse {
  ok: false;
  error: {
    code: ApiErrorCode;
    message: string;
    details?: Record<string, unknown>;
  };
}

export type ApiResponse<T> = T | ApiErrorResponse;

export interface QuestLogRecord {
  id: string;
  user_id: string | null;
  anonymous_session_id: string | null;
  quest_id: string | null;
  title: string;
  quest_type: QuestType;
  amount: number;
  unit: string;
  difficulty: QuestDifficulty;
  deadline_at: string | null;
  result: QuestLogResult;
  exp_delta: number;
  failure_reason: string | null;
  previous_quest_title: string | null;
  recovery_from_log_id: string | null;
  manager_mood_after: ManagerMood | null;
  client_created_at: string | null;
  created_at: string;
  visibility: QuestLogVisibility;
  event_version: number;
  metadata: Record<string, unknown>;
}

const questTypes = new Set<QuestType>(["time", "quantity", "action"]);
const difficulties = new Set<QuestDifficulty>(["easy", "normal", "hard"]);
const results = new Set<QuestLogResult>(["success", "failed", "recovery"]);
const managerMoods = new Set<ManagerMood>(["waiting", "focused", "happy", "recovering"]);

export function toQuestLogResponseItem(record: QuestLogRecord): QuestLogResponseItem {
  return {
    id: record.id,
    title: record.title,
    result: record.result,
    expDelta: record.exp_delta,
    failureReason: record.failure_reason,
    createdAt: record.created_at,
  };
}

export function createErrorResponse(
  code: ApiErrorCode,
  message: string,
  details?: Record<string, unknown>,
): ApiErrorResponse {
  return { ok: false, error: { code, message, details } };
}

export function isApiErrorResponse(value: unknown): value is ApiErrorResponse {
  return isRecord(value) && value.ok === false && isRecord(value.error);
}

export function parseCreateQuestLogRequest(value: unknown): CreateQuestLogRequest | ApiErrorResponse {
  if (!isRecord(value)) return createErrorResponse("VALIDATION_ERROR", "Request body must be an object.");

  const quest = value.quest;
  if (!isRecord(quest)) return createErrorResponse("VALIDATION_ERROR", "quest is required.", { field: "quest" });

  const title = stringField(quest.title);
  if (!title) return createErrorResponse("VALIDATION_ERROR", "quest.title is required.", { field: "quest.title" });

  if (!questTypes.has(quest.type as QuestType)) {
    return createErrorResponse("VALIDATION_ERROR", "quest.type is invalid.", { field: "quest.type" });
  }

  if (!Number.isInteger(quest.amount) || Number(quest.amount) < 1) {
    return createErrorResponse("VALIDATION_ERROR", "quest.amount must be a positive integer.", { field: "quest.amount" });
  }

  const unit = stringField(quest.unit);
  if (!unit) return createErrorResponse("VALIDATION_ERROR", "quest.unit is required.", { field: "quest.unit" });

  if (!difficulties.has(quest.difficulty as QuestDifficulty)) {
    return createErrorResponse("VALIDATION_ERROR", "quest.difficulty is invalid.", { field: "quest.difficulty" });
  }

  if (!results.has(value.result as QuestLogResult)) {
    return createErrorResponse("VALIDATION_ERROR", "result is invalid.", { field: "result" });
  }

  if (!Number.isInteger(value.expDelta)) {
    return createErrorResponse("VALIDATION_ERROR", "expDelta must be an integer.", { field: "expDelta" });
  }

  if (value.managerMoodAfter != null && !managerMoods.has(value.managerMoodAfter as ManagerMood)) {
    return createErrorResponse("VALIDATION_ERROR", "managerMoodAfter is invalid.", { field: "managerMoodAfter" });
  }

  return {
    quest: {
      title,
      type: quest.type as QuestType,
      amount: Number(quest.amount),
      unit,
      difficulty: quest.difficulty as QuestDifficulty,
      deadlineAt: nullableString(quest.deadlineAt),
    },
    result: value.result as QuestLogResult,
    expDelta: Number(value.expDelta),
    failureReason: nullableString(value.failureReason),
    previousQuestTitle: nullableString(value.previousQuestTitle),
    recoveryFromLogId: nullableString(value.recoveryFromLogId),
    managerMoodAfter: nullableManagerMood(value.managerMoodAfter),
    clientCreatedAt: nullableString(value.clientCreatedAt),
    metadata: isRecord(value.metadata) ? value.metadata : {},
  };
}

export function parseGetQuestLogsQuery(url: URL): GetQuestLogsQuery | ApiErrorResponse {
  const limitParam = url.searchParams.get("limit");
  const parsedLimit = limitParam ? Number(limitParam) : 20;

  if (!Number.isInteger(parsedLimit) || parsedLimit < 1 || parsedLimit > 100) {
    return createErrorResponse("VALIDATION_ERROR", "limit must be an integer from 1 to 100.", { field: "limit" });
  }

  const result = url.searchParams.get("result");
  if (result && !results.has(result as QuestLogResult)) {
    return createErrorResponse("VALIDATION_ERROR", "result is invalid.", { field: "result" });
  }

  return {
    limit: parsedLimit,
    cursor: url.searchParams.get("cursor") ?? undefined,
    result: result ? (result as QuestLogResult) : undefined,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function stringField(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function nullableString(value: unknown) {
  if (value == null) return null;
  return typeof value === "string" ? value : null;
}

function nullableManagerMood(value: unknown) {
  if (value == null) return null;
  return managerMoods.has(value as ManagerMood) ? (value as ManagerMood) : null;
}
