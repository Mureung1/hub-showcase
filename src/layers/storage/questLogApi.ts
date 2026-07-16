import type { QuestLog, QuestLogResult } from "../../data/questLogs";

export type QuestEventType =
  | "quest_suggested"
  | "quest_accepted"
  | "quest_completed"
  | "quest_failed"
  | "recovery_started"
  | "recovery_completed"
  | "manager_reaction"
  | "reward_unlocked";

export interface QuestLogQuestRequest {
  title: string;
  type: "time" | "quantity" | "action";
  amount: number;
  unit: string;
  difficulty: "easy" | "normal" | "hard";
  deadlineAt: string | null;
}

export interface CreateQuestEventRequest {
  type: QuestEventType;
  quest: QuestLogQuestRequest;
  result?: QuestLogResult | null;
  expDelta: number;
  failureReason?: string | null;
  previousQuestTitle?: string | null;
  recoveryFromEventId?: string | null;
  managerMoodAfter?: "waiting" | "focused" | "happy" | "recovering" | null;
  managerLine?: string | null;
  clientCreatedAt?: string | null;
  metadata?: Record<string, unknown>;
}

export interface QuestEventResponseItem {
  id: string;
  type: QuestEventType;
  title: string;
  result: QuestLogResult | null;
  expDelta: number;
  failureReason: string | null;
  managerMoodAfter: "waiting" | "focused" | "happy" | "recovering" | null;
  createdAt: string;
  metadata: Record<string, unknown>;
}

export interface ManagerContext {
  currentMood: "waiting" | "focused" | "happy" | "recovering";
  recentEventCount: number;
  lastQuestResult: QuestLogResult | null;
  memorySummary: string;
  rewardHints: string[];
}

interface ApiErrorResponse {
  ok: false;
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}

interface CreateQuestEventResponse {
  ok: true;
  data: QuestEventResponseItem;
  managerContext: ManagerContext;
}

interface GetQuestEventsResponse {
  ok: true;
  data: QuestEventResponseItem[];
  page: {
    nextCursor: string | null;
  };
}

interface ManagerContextResponse {
  ok: true;
  data: ManagerContext;
}

type QuestEventApiResponse<T> = T | ApiErrorResponse;

export async function createQuestEventViaApi(input: CreateQuestEventRequest) {
  const response = await fetch("/api/quest-events", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
  });
  const payload = (await response.json()) as QuestEventApiResponse<CreateQuestEventResponse>;

  if (!response.ok || !payload.ok) {
    throw new Error(payload.ok ? "Quest event save failed." : payload.error.message);
  }

  return {
    log: hasJournalResult(payload.data) ? toQuestLog(payload.data) : null,
    event: payload.data,
    managerContext: payload.managerContext,
  };
}

export async function fetchQuestEventsViaApi(limit = 20) {
  const response = await fetch(`/api/quest-events?limit=${limit}`);
  const payload = (await response.json()) as QuestEventApiResponse<GetQuestEventsResponse>;

  if (!response.ok || !payload.ok) {
    throw new Error(payload.ok ? "Quest events load failed." : payload.error.message);
  }

  return payload.data.filter(hasJournalResult).map(toQuestLog);
}

export async function fetchManagerContextViaApi() {
  const response = await fetch("/api/manager-context");
  const payload = (await response.json()) as QuestEventApiResponse<ManagerContextResponse>;

  if (!response.ok || !payload.ok) {
    throw new Error(payload.ok ? "Manager context load failed." : payload.error.message);
  }

  return payload.data;
}

function hasJournalResult(item: QuestEventResponseItem): item is QuestEventResponseItem & { result: QuestLogResult } {
  return item.result !== null;
}

function toQuestLog(item: QuestEventResponseItem & { result: QuestLogResult }): QuestLog {
  return {
    id: item.id,
    title: item.title,
    result: item.result,
    exp: item.expDelta,
    reason: item.failureReason ?? undefined,
    createdAt: item.createdAt,
  };
}
