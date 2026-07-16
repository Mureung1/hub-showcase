export type QuestEventType =
  | "quest_suggested"
  | "quest_accepted"
  | "quest_completed"
  | "quest_failed"
  | "recovery_started"
  | "recovery_completed"
  | "manager_reaction"
  | "reward_unlocked";

export type QuestEventResult = "success" | "failed" | "recovery";
export type QuestType = "time" | "quantity" | "action";
export type QuestDifficulty = "easy" | "normal" | "hard";
export type QuestEventVisibility = "private" | "anonymous_public" | "friends_only";
export type ManagerMood = "waiting" | "focused" | "happy" | "recovering";

export interface QuestEventQuestInput {
  title: string;
  type: QuestType;
  amount: number;
  unit: string;
  difficulty: QuestDifficulty;
  deadlineAt?: string | null;
}

export interface CreateQuestEventRequest {
  type: QuestEventType;
  quest: QuestEventQuestInput;
  result?: QuestEventResult | null;
  expDelta: number;
  failureReason?: string | null;
  previousQuestTitle?: string | null;
  recoveryFromEventId?: string | null;
  managerMoodAfter?: ManagerMood | null;
  managerLine?: string | null;
  clientCreatedAt?: string | null;
  metadata?: Record<string, unknown>;
}

export interface QuestEventRecord {
  id: string;
  user_id: string | null;
  anonymous_session_id: string | null;
  quest_id: string | null;
  event_type: QuestEventType;
  title: string;
  quest_type: QuestType;
  amount: number;
  unit: string;
  difficulty: QuestDifficulty;
  deadline_at: string | null;
  result: QuestEventResult | null;
  exp_delta: number;
  failure_reason: string | null;
  previous_quest_title: string | null;
  recovery_from_event_id: string | null;
  manager_mood_after: ManagerMood | null;
  manager_line: string | null;
  client_created_at: string | null;
  created_at: string;
  visibility: QuestEventVisibility;
  event_version: number;
  metadata: Record<string, unknown>;
}

export interface QuestEventResponseItem {
  id: string;
  type: QuestEventType;
  title: string;
  result: QuestEventResult | null;
  expDelta: number;
  failureReason: string | null;
  managerMoodAfter: ManagerMood | null;
  createdAt: string;
  metadata: Record<string, unknown>;
}

export interface CreateQuestEventResponse {
  ok: true;
  data: QuestEventResponseItem;
  managerContext: ManagerContext;
}

export interface GetQuestEventsQuery {
  limit: number;
  cursor?: string;
  type?: QuestEventType;
  result?: QuestEventResult;
}

export interface GetQuestEventsResponse {
  ok: true;
  data: QuestEventResponseItem[];
  page: {
    nextCursor: string | null;
  };
}

export interface ManagerContext {
  currentMood: ManagerMood;
  recentEventCount: number;
  lastQuestResult: QuestEventResult | null;
  memorySummary: string;
  rewardHints: string[];
}

export interface ManagerContextResponse {
  ok: true;
  data: ManagerContext;
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

const eventTypes = new Set<QuestEventType>([
  "quest_suggested",
  "quest_accepted",
  "quest_completed",
  "quest_failed",
  "recovery_started",
  "recovery_completed",
  "manager_reaction",
  "reward_unlocked",
]);
const questTypes = new Set<QuestType>(["time", "quantity", "action"]);
const difficulties = new Set<QuestDifficulty>(["easy", "normal", "hard"]);
const results = new Set<QuestEventResult>(["success", "failed", "recovery"]);
const managerMoods = new Set<ManagerMood>(["waiting", "focused", "happy", "recovering"]);

export function toQuestEventResponseItem(record: QuestEventRecord): QuestEventResponseItem {
  return {
    id: record.id,
    type: record.event_type,
    title: record.title,
    result: record.result,
    expDelta: record.exp_delta,
    failureReason: record.failure_reason,
    managerMoodAfter: record.manager_mood_after,
    createdAt: record.created_at,
    metadata: record.metadata,
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

export function parseCreateQuestEventRequest(value: unknown): CreateQuestEventRequest | ApiErrorResponse {
  if (!isRecord(value)) return createErrorResponse("VALIDATION_ERROR", "Request body must be an object.");
  if (!eventTypes.has(value.type as QuestEventType)) {
    return createErrorResponse("VALIDATION_ERROR", "type is invalid.", { field: "type" });
  }

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
  if (value.result != null && !results.has(value.result as QuestEventResult)) {
    return createErrorResponse("VALIDATION_ERROR", "result is invalid.", { field: "result" });
  }
  if (!Number.isInteger(value.expDelta)) {
    return createErrorResponse("VALIDATION_ERROR", "expDelta must be an integer.", { field: "expDelta" });
  }
  if (value.managerMoodAfter != null && !managerMoods.has(value.managerMoodAfter as ManagerMood)) {
    return createErrorResponse("VALIDATION_ERROR", "managerMoodAfter is invalid.", { field: "managerMoodAfter" });
  }

  return {
    type: value.type as QuestEventType,
    quest: {
      title,
      type: quest.type as QuestType,
      amount: Number(quest.amount),
      unit,
      difficulty: quest.difficulty as QuestDifficulty,
      deadlineAt: nullableString(quest.deadlineAt),
    },
    result: nullableResult(value.result),
    expDelta: Number(value.expDelta),
    failureReason: nullableString(value.failureReason),
    previousQuestTitle: nullableString(value.previousQuestTitle),
    recoveryFromEventId: nullableString(value.recoveryFromEventId),
    managerMoodAfter: nullableManagerMood(value.managerMoodAfter),
    managerLine: nullableString(value.managerLine),
    clientCreatedAt: nullableString(value.clientCreatedAt),
    metadata: isRecord(value.metadata) ? value.metadata : {},
  };
}

export function parseGetQuestEventsQuery(url: URL): GetQuestEventsQuery | ApiErrorResponse {
  const limitParam = url.searchParams.get("limit");
  const parsedLimit = limitParam ? Number(limitParam) : 20;

  if (!Number.isInteger(parsedLimit) || parsedLimit < 1 || parsedLimit > 100) {
    return createErrorResponse("VALIDATION_ERROR", "limit must be an integer from 1 to 100.", { field: "limit" });
  }

  const type = url.searchParams.get("type");
  if (type && !eventTypes.has(type as QuestEventType)) {
    return createErrorResponse("VALIDATION_ERROR", "type is invalid.", { field: "type" });
  }

  const result = url.searchParams.get("result");
  if (result && !results.has(result as QuestEventResult)) {
    return createErrorResponse("VALIDATION_ERROR", "result is invalid.", { field: "result" });
  }

  return {
    limit: parsedLimit,
    cursor: url.searchParams.get("cursor") ?? undefined,
    type: type ? (type as QuestEventType) : undefined,
    result: result ? (result as QuestEventResult) : undefined,
  };
}

export function buildManagerContext(records: QuestEventRecord[]): ManagerContext {
  const recent = [...records].sort((a, b) => b.created_at.localeCompare(a.created_at));
  const lastQuestResult = recent.find((record) => record.result)?.result ?? null;
  const currentMood = recent.find((record) => record.manager_mood_after)?.manager_mood_after ?? "waiting";
  const failures = recent.filter((record) => record.result === "failed").length;
  const recoveries = recent.filter((record) => record.result === "recovery").length;
  const successes = recent.filter((record) => record.result === "success").length;

  const rewardHints: string[] = [];
  if (successes > 0) rewardHints.push("character_animation");
  if (recoveries > 0) rewardHints.push("memory_fragment");
  if (failures > 0) rewardHints.push("gentle_recovery_tone");

  return {
    currentMood,
    recentEventCount: recent.length,
    lastQuestResult,
    memorySummary: `최근 이벤트 ${recent.length}개: 완료 ${successes}회, 실패 ${failures}회, 복구 ${recoveries}회.`,
    rewardHints,
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

function nullableResult(value: unknown) {
  if (value == null) return null;
  return results.has(value as QuestEventResult) ? (value as QuestEventResult) : null;
}

function nullableManagerMood(value: unknown) {
  if (value == null) return null;
  return managerMoods.has(value as ManagerMood) ? (value as ManagerMood) : null;
}
