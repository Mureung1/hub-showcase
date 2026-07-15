import {
  waitingEventActorTypes,
  waitingEventTypes,
  waitingStatusSchema,
} from "@baro-jinryo/shared";
import { z } from "zod";
import type { DatabaseExecutor } from "../../db/databaseExecutor.js";
import type {
  CreateWaitingEventInput,
  WaitingEvent,
  WaitingEventRepository,
} from "../waitingEventRepository.js";

const waitingEventRowSchema = z.object({
  id: z.uuid(),
  waiting_entry_id: z.uuid(),
  actor_account_id: z.uuid().nullable(),
  actor_type: z.enum(waitingEventActorTypes),
  event_type: z.enum(waitingEventTypes),
  from_status: waitingStatusSchema.nullable(),
  to_status: waitingStatusSchema.nullable(),
  metadata: z.record(z.string(), z.unknown()),
  created_at: z.date(),
});

type WaitingEventRow = z.infer<typeof waitingEventRowSchema>;

const waitingEventColumns = `
  id, waiting_entry_id, actor_account_id, actor_type, event_type,
  from_status, to_status, metadata, created_at
`;

function toWaitingEvent(row: unknown): WaitingEvent {
  const event = waitingEventRowSchema.parse(row);
  return {
    id: event.id,
    waitingEntryId: event.waiting_entry_id,
    actorAccountId: event.actor_account_id,
    actorType: event.actor_type,
    eventType: event.event_type,
    fromStatus: event.from_status,
    toStatus: event.to_status,
    metadata: event.metadata,
    createdAt: event.created_at,
  };
}

export class PgWaitingEventRepository implements WaitingEventRepository {
  async create(
    executor: DatabaseExecutor,
    input: CreateWaitingEventInput,
  ): Promise<WaitingEvent> {
    const result = await executor.query<WaitingEventRow>(
      `
        INSERT INTO public.waiting_events
          (waiting_entry_id, actor_account_id, actor_type, event_type,
           from_status, to_status, metadata)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING ${waitingEventColumns}
      `,
      [
        input.waitingEntryId,
        input.actorAccountId,
        input.actorType,
        input.eventType,
        input.fromStatus,
        input.toStatus,
        input.metadata,
      ],
    );
    const row = result.rows[0];
    if (!row) throw new Error("웨이팅 이력 생성 결과를 찾을 수 없습니다.");
    return toWaitingEvent(row);
  }

  async listByWaitingEntry(
    executor: DatabaseExecutor,
    waitingEntryId: string,
  ): Promise<WaitingEvent[]> {
    const result = await executor.query<WaitingEventRow>(
      `
        SELECT ${waitingEventColumns}
        FROM public.waiting_events
        WHERE waiting_entry_id = $1
        ORDER BY created_at ASC, id ASC
      `,
      [waitingEntryId],
    );
    return result.rows.map(toWaitingEvent);
  }
}
