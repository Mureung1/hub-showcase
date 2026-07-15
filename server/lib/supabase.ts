import type { CreateQuestLogRequest, GetQuestLogsQuery, QuestLogRecord } from "../contracts/questLogs";

export interface SupabaseConfig {
  url: string;
  serviceRoleKey: string;
}

export interface QuestLogStore {
  insertQuestLog(input: CreateQuestLogRequest): Promise<QuestLogRecord>;
  listQuestLogs(query: GetQuestLogsQuery): Promise<{ records: QuestLogRecord[]; nextCursor: string | null }>;
}

export const supabaseEnvNames = {
  url: "SUPABASE_URL",
  serviceRoleKey: "SUPABASE_SERVICE_ROLE_KEY",
} as const;

export function createSupabaseConfigFromEnv(getEnv: (name: string) => string | undefined): SupabaseConfig {
  const url = getEnv(supabaseEnvNames.url);
  const serviceRoleKey = getEnv(supabaseEnvNames.serviceRoleKey);

  if (!url || !serviceRoleKey) {
    throw new Error("Supabase environment variables are not configured.");
  }

  return { url, serviceRoleKey };
}

export function createSupabaseQuestLogStore(config: SupabaseConfig): QuestLogStore {
  const endpoint = `${config.url.replace(/\/$/, "")}/rest/v1/quest_logs`;
  const headers = {
    apikey: config.serviceRoleKey,
    authorization: `Bearer ${config.serviceRoleKey}`,
    "content-type": "application/json",
  };

  return {
    async insertQuestLog(input) {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { ...headers, prefer: "return=representation" },
        body: JSON.stringify(toInsertRow(input)),
      });

      if (!response.ok) throw new Error(`Supabase insert failed: ${response.status}`);

      const rows = (await response.json()) as QuestLogRecord[];
      const record = rows[0];
      if (!record) throw new Error("Supabase insert returned no rows.");
      return record;
    },
    async listQuestLogs(query) {
      const url = new URL(endpoint);
      url.searchParams.set("select", "*");
      url.searchParams.set("order", "created_at.desc");
      url.searchParams.set("limit", String(query.limit));
      if (query.result) url.searchParams.set("result", `eq.${query.result}`);
      if (query.cursor) url.searchParams.set("created_at", `lt.${query.cursor}`);

      const response = await fetch(url, { headers });
      if (!response.ok) throw new Error(`Supabase select failed: ${response.status}`);

      const records = (await response.json()) as QuestLogRecord[];
      const nextCursor = records.length === query.limit ? records[records.length - 1]?.created_at ?? null : null;
      return { records, nextCursor };
    },
  };
}

function toInsertRow(input: CreateQuestLogRequest) {
  return {
    title: input.quest.title,
    quest_type: input.quest.type,
    amount: input.quest.amount,
    unit: input.quest.unit,
    difficulty: input.quest.difficulty,
    deadline_at: input.quest.deadlineAt ?? null,
    result: input.result,
    exp_delta: input.expDelta,
    failure_reason: input.failureReason ?? null,
    previous_quest_title: input.previousQuestTitle ?? null,
    recovery_from_log_id: input.recoveryFromLogId ?? null,
    manager_mood_after: input.managerMoodAfter ?? null,
    client_created_at: input.clientCreatedAt ?? null,
    visibility: "private",
    event_version: 1,
    metadata: input.metadata ?? {},
  };
}
