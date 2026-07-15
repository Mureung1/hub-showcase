import type { QuestLog, QuestLogResult } from "../../data/questLogs";

export interface QuestLogQuestRequest {
  title: string;
  type: "time" | "quantity" | "action";
  amount: number;
  unit: string;
  difficulty: "easy" | "normal" | "hard";
  deadlineAt: string | null;
}

export interface CreateQuestLogRequest {
  quest: QuestLogQuestRequest;
  result: QuestLogResult;
  expDelta: number;
  failureReason?: string | null;
  previousQuestTitle?: string | null;
  recoveryFromLogId?: string | null;
  managerMoodAfter?: "waiting" | "focused" | "happy" | "recovering" | null;
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

interface ApiErrorResponse {
  ok: false;
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}

interface CreateQuestLogResponse {
  ok: true;
  data: QuestLogResponseItem;
}

interface GetQuestLogsResponse {
  ok: true;
  data: QuestLogResponseItem[];
  page: {
    nextCursor: string | null;
  };
}

type QuestLogApiResponse<T> = T | ApiErrorResponse;

export async function createQuestLogViaApi(input: CreateQuestLogRequest) {
  const response = await fetch("/api/quest-logs", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
  });
  const payload = (await response.json()) as QuestLogApiResponse<CreateQuestLogResponse>;

  if (!response.ok || !payload.ok) {
    throw new Error(payload.ok ? "Quest log save failed." : payload.error.message);
  }

  return toQuestLog(payload.data);
}

export async function fetchQuestLogsViaApi(limit = 20) {
  const response = await fetch(`/api/quest-logs?limit=${limit}`);
  const payload = (await response.json()) as QuestLogApiResponse<GetQuestLogsResponse>;

  if (!response.ok || !payload.ok) {
    throw new Error(payload.ok ? "Quest log load failed." : payload.error.message);
  }

  return payload.data.map(toQuestLog);
}

function toQuestLog(item: QuestLogResponseItem): QuestLog {
  return {
    id: item.id,
    title: item.title,
    result: item.result,
    exp: item.expDelta,
    reason: item.failureReason ?? undefined,
    createdAt: item.createdAt,
  };
}
