import type {
  CreateQuestEventRequest,
  GetQuestEventsQuery,
  ManagerContext,
  QuestEventRecord,
} from "../contracts/questEvents";
import { buildManagerContext } from "../contracts/questEvents";

export interface QuestEventStore {
  insertQuestEvent(input: CreateQuestEventRequest): Promise<QuestEventRecord>;
  listQuestEvents(query: GetQuestEventsQuery): Promise<{ records: QuestEventRecord[]; nextCursor: string | null }>;
  getManagerContext(): Promise<ManagerContext>;
}

export function createMemoryQuestEventStore(initialRecords: QuestEventRecord[] = []): QuestEventStore {
  const records = [...initialRecords];

  return {
    async insertQuestEvent(input) {
      const record = toMemoryRecord(input);
      records.unshift(record);
      return record;
    },
    async listQuestEvents(query) {
      let filtered = records;
      if (query.type) filtered = filtered.filter((record) => record.event_type === query.type);
      if (query.result) filtered = filtered.filter((record) => record.result === query.result);
      if (query.cursor) {
        const cursor = query.cursor;
        filtered = filtered.filter((record) => record.created_at < cursor);
      }

      const page = filtered.slice(0, query.limit);
      return {
        records: page,
        nextCursor: page.length === query.limit ? page[page.length - 1]?.created_at ?? null : null,
      };
    },
    async getManagerContext() {
      return buildManagerContext(records);
    },
  };
}

function toMemoryRecord(input: CreateQuestEventRequest): QuestEventRecord {
  const createdAt = new Date().toISOString();

  return {
    id: typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`,
    user_id: null,
    anonymous_session_id: "local-dev",
    quest_id: null,
    event_type: input.type,
    title: input.quest.title,
    quest_type: input.quest.type,
    amount: input.quest.amount,
    unit: input.quest.unit,
    difficulty: input.quest.difficulty,
    deadline_at: input.quest.deadlineAt ?? null,
    result: input.result ?? null,
    exp_delta: input.expDelta,
    failure_reason: input.failureReason ?? null,
    previous_quest_title: input.previousQuestTitle ?? null,
    recovery_from_event_id: input.recoveryFromEventId ?? null,
    manager_mood_after: input.managerMoodAfter ?? null,
    manager_line: input.managerLine ?? null,
    client_created_at: input.clientCreatedAt ?? null,
    created_at: createdAt,
    visibility: "private",
    event_version: 1,
    metadata: input.metadata ?? {},
  };
}
