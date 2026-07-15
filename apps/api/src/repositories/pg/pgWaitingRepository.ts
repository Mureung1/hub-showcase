import {
  e164PhoneNumberSchema,
  waitingSourceSchema,
  waitingStatusSchema,
} from "@baro-jinryo/shared";
import { z } from "zod";
import type { DatabaseExecutor } from "../../db/databaseExecutor.js";
import type {
  CreateWaitingEntryCountInput,
  CreateWaitingEntryInput,
  RegistrationSlot,
  NoShowMoveResult,
  WaitingEntry,
  WaitingEntryCount,
  WaitingRepository,
} from "../waitingRepository.js";

const waitingEntryRowSchema = z.object({
  id: z.uuid(),
  queue_id: z.uuid(),
  account_id: z.uuid().nullable(),
  source: waitingSourceSchema,
  phone_number: e164PhoneNumberSchema,
  ticket_number: z.string(),
  status: waitingStatusSchema,
  queue_order: z.number().int().positive(),
  patient_count: z.number().int().min(1).max(9),
  lookup_token_hash: z.string().nullable(),
  patient_defer_count: z.number().int().min(0).max(1),
  no_show_move_count: z.number().int().min(0).max(1),
  preparation_notified_at: z.date().nullable(),
  onsite_near_turn_notified_at: z.date().nullable(),
  entry_requested_at: z.date().nullable(),
  arrival_deadline_at: z.date().nullable(),
  called_at: z.date().nullable(),
  cancelled_at: z.date().nullable(),
  created_at: z.date(),
  updated_at: z.date(),
});

const waitingEntryCountRowSchema = z.object({
  waiting_entry_id: z.uuid(),
  patient_category_id: z.uuid(),
  count: z.number().int().min(1).max(9),
});

type WaitingEntryRow = z.infer<typeof waitingEntryRowSchema>;
type WaitingEntryCountRow = z.infer<typeof waitingEntryCountRowSchema>;

const waitingEntryColumns = `
  id, queue_id, account_id, source, phone_number, ticket_number, status,
  queue_order, patient_count, lookup_token_hash, patient_defer_count,
  no_show_move_count, preparation_notified_at, onsite_near_turn_notified_at,
  entry_requested_at, arrival_deadline_at, called_at, cancelled_at,
  created_at, updated_at
`;

function toWaitingEntry(row: unknown): WaitingEntry {
  const entry = waitingEntryRowSchema.parse(row);
  return {
    id: entry.id,
    queueId: entry.queue_id,
    accountId: entry.account_id,
    source: entry.source,
    phoneNumber: entry.phone_number,
    ticketNumber: entry.ticket_number,
    status: entry.status,
    queueOrder: entry.queue_order,
    patientCount: entry.patient_count,
    lookupTokenHash: entry.lookup_token_hash,
    patientDeferCount: entry.patient_defer_count,
    noShowMoveCount: entry.no_show_move_count,
    preparationNotifiedAt: entry.preparation_notified_at,
    onsiteNearTurnNotifiedAt: entry.onsite_near_turn_notified_at,
    entryRequestedAt: entry.entry_requested_at,
    arrivalDeadlineAt: entry.arrival_deadline_at,
    calledAt: entry.called_at,
    cancelledAt: entry.cancelled_at,
    createdAt: entry.created_at,
    updatedAt: entry.updated_at,
  };
}

function toWaitingEntryCount(row: unknown): WaitingEntryCount {
  const count = waitingEntryCountRowSchema.parse(row);
  return {
    waitingEntryId: count.waiting_entry_id,
    patientCategoryId: count.patient_category_id,
    count: count.count,
  };
}

export class PgWaitingRepository implements WaitingRepository {
  async allocateRegistrationSlot(
    executor: DatabaseExecutor,
    queueId: string,
  ): Promise<RegistrationSlot> {
    const ticketResult = await executor.query<{ ticket_number: number }>(
      `
        UPDATE public.daily_queues
        SET next_ticket_number = next_ticket_number + 1
        WHERE id = $1
        RETURNING next_ticket_number - 1 AS ticket_number
      `,
      [queueId],
    );
    const ticketNumber = ticketResult.rows[0]?.ticket_number;
    if (!ticketNumber) throw new Error("접수번호를 발급할 대기열을 찾을 수 없습니다.");

    const orderResult = await executor.query<{ queue_order: number }>(
      `
        SELECT COALESCE(MAX(queue_order), 0) + 1 AS queue_order
        FROM public.waiting_entries
        WHERE queue_id = $1
          AND status IN ('remote_waiting', 'entry_requested', 'onsite_waiting')
      `,
      [queueId],
    );
    const queueOrder = orderResult.rows[0]?.queue_order;
    if (!queueOrder) throw new Error("대기열 마지막 순서를 계산할 수 없습니다.");

    return { ticketNumber: String(ticketNumber), queueOrder };
  }

  async findById(executor: DatabaseExecutor, id: string): Promise<WaitingEntry | null> {
    const result = await executor.query<WaitingEntryRow>(
      `SELECT ${waitingEntryColumns} FROM public.waiting_entries WHERE id = $1`,
      [id],
    );
    return result.rows[0] ? toWaitingEntry(result.rows[0]) : null;
  }

  async findActiveRemoteByAccount(
    executor: DatabaseExecutor,
    accountId: string,
  ): Promise<WaitingEntry | null> {
    const result = await executor.query<WaitingEntryRow>(
      `
        SELECT ${waitingEntryColumns}
        FROM public.waiting_entries
        WHERE account_id = $1
          AND source = 'remote'
          AND status IN ('remote_waiting', 'entry_requested', 'onsite_waiting')
        LIMIT 1
      `,
      [accountId],
    );
    return result.rows[0] ? toWaitingEntry(result.rows[0]) : null;
  }

  async listByQueue(executor: DatabaseExecutor, queueId: string): Promise<WaitingEntry[]> {
    const result = await executor.query<WaitingEntryRow>(
      `
        SELECT ${waitingEntryColumns}
        FROM public.waiting_entries
        WHERE queue_id = $1
        ORDER BY queue_order ASC, created_at ASC
      `,
      [queueId],
    );
    return result.rows.map(toWaitingEntry);
  }

  async sumActiveRemotePatients(executor: DatabaseExecutor, queueId: string): Promise<number> {
    const result = await executor.query<{ patient_count: string | number }>(
      `
        SELECT COALESCE(SUM(patient_count), 0) AS patient_count
        FROM public.waiting_entries
        WHERE queue_id = $1
          AND source = 'remote'
          AND status IN ('remote_waiting', 'entry_requested', 'onsite_waiting')
      `,
      [queueId],
    );
    return Number(result.rows[0]?.patient_count ?? 0);
  }

  async create(executor: DatabaseExecutor, input: CreateWaitingEntryInput): Promise<WaitingEntry> {
    const result = await executor.query<WaitingEntryRow>(
      `
        INSERT INTO public.waiting_entries
          (queue_id, account_id, source, phone_number, ticket_number, status,
           queue_order, patient_count, lookup_token_hash)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING ${waitingEntryColumns}
      `,
      [
        input.queueId,
        input.accountId,
        input.source,
        input.phoneNumber,
        input.ticketNumber,
        input.status,
        input.queueOrder,
        input.patientCount,
        input.lookupTokenHash,
      ],
    );
    const row = result.rows[0];
    if (!row) throw new Error("웨이팅 생성 결과를 찾을 수 없습니다.");
    return toWaitingEntry(row);
  }

  async createCounts(
    executor: DatabaseExecutor,
    waitingEntryId: string,
    counts: CreateWaitingEntryCountInput[],
  ): Promise<WaitingEntryCount[]> {
    if (counts.length === 0) return [];

    const result = await executor.query<WaitingEntryCountRow>(
      `
        INSERT INTO public.waiting_entry_counts
          (waiting_entry_id, patient_category_id, count)
        SELECT $1, input.patient_category_id, input.count
        FROM unnest($2::uuid[], $3::integer[]) AS input(patient_category_id, count)
        RETURNING waiting_entry_id, patient_category_id, count
      `,
      [
        waitingEntryId,
        counts.map(({ patientCategoryId }) => patientCategoryId),
        counts.map(({ count }) => count),
      ],
    );
    return result.rows.map(toWaitingEntryCount);
  }

  async markPreparationNotified(
    executor: DatabaseExecutor,
    waitingEntryId: string,
    notifiedAt: Date,
  ): Promise<WaitingEntry | null> {
    return this.markNotificationTime(
      executor,
      waitingEntryId,
      "preparation_notified_at",
      "remote",
      "remote_waiting",
      notifiedAt,
    );
  }

  async requestEntry(
    executor: DatabaseExecutor,
    waitingEntryId: string,
    requestedAt: Date,
    arrivalDeadlineAt: Date,
  ): Promise<WaitingEntry | null> {
    const result = await executor.query<WaitingEntryRow>(
      `
        UPDATE public.waiting_entries
        SET status = 'entry_requested',
            entry_requested_at = $2,
            arrival_deadline_at = $3,
            updated_at = now()
        WHERE id = $1
          AND source = 'remote'
          AND status = 'remote_waiting'
          AND entry_requested_at IS NULL
        RETURNING ${waitingEntryColumns}
      `,
      [waitingEntryId, requestedAt, arrivalDeadlineAt],
    );
    return result.rows[0] ? toWaitingEntry(result.rows[0]) : null;
  }

  async markOnsiteNearTurnNotified(
    executor: DatabaseExecutor,
    waitingEntryId: string,
    notifiedAt: Date,
  ): Promise<WaitingEntry | null> {
    return this.markNotificationTime(
      executor,
      waitingEntryId,
      "onsite_near_turn_notified_at",
      "onsite",
      "onsite_waiting",
      notifiedAt,
    );
  }

  private async markNotificationTime(
    executor: DatabaseExecutor,
    waitingEntryId: string,
    column: "preparation_notified_at" | "onsite_near_turn_notified_at",
    source: "remote" | "onsite",
    status: "remote_waiting" | "onsite_waiting",
    notifiedAt: Date,
  ): Promise<WaitingEntry | null> {
    const result = await executor.query<WaitingEntryRow>(
      `
        UPDATE public.waiting_entries
        SET ${column} = $2, updated_at = now()
        WHERE id = $1
          AND source = $3
          AND status = $4
          AND ${column} IS NULL
        RETURNING ${waitingEntryColumns}
      `,
      [waitingEntryId, notifiedAt, source, status],
    );
    return result.rows[0] ? toWaitingEntry(result.rows[0]) : null;
  }

  async moveNoShowToEnd(
    executor: DatabaseExecutor,
    waitingEntryId: string,
    expectedUpdatedAt: Date,
  ): Promise<NoShowMoveResult | null> {
    const result = await executor.query<
      WaitingEntryRow & { previous_queue_order: number }
    >(
      `
        WITH target AS (
          SELECT id, queue_id, queue_order
          FROM public.waiting_entries
          WHERE id = $1
            AND source = 'remote'
            AND status = 'entry_requested'
            AND no_show_move_count = 0
            AND updated_at = $2
          FOR UPDATE
        ),
        queue_lock AS (
          SELECT queue.id
          FROM public.daily_queues AS queue
          JOIN target ON target.queue_id = queue.id
          FOR UPDATE
        ),
        last_order AS (
          SELECT COALESCE(MAX(entry.queue_order), 0) + 1 AS queue_order
          FROM public.waiting_entries AS entry
          JOIN target ON target.queue_id = entry.queue_id
          CROSS JOIN queue_lock
          WHERE entry.status IN ('remote_waiting', 'entry_requested', 'onsite_waiting')
        ),
        moved AS (
          UPDATE public.waiting_entries AS entry
          SET queue_order = last_order.queue_order,
              no_show_move_count = 1,
              updated_at = now()
          FROM target, last_order
          WHERE entry.id = target.id
            AND NOT EXISTS (
              SELECT 1
              FROM public.waiting_entries AS ahead
              WHERE ahead.queue_id = target.queue_id
                AND ahead.status IN ('remote_waiting', 'entry_requested', 'onsite_waiting')
                AND ahead.queue_order < target.queue_order
            )
          RETURNING ${waitingEntryColumns}
        )
        SELECT moved.*, target.queue_order AS previous_queue_order
        FROM moved
        CROSS JOIN target
      `,
      [waitingEntryId, expectedUpdatedAt],
    );
    const row = result.rows[0];
    return row
      ? { waiting: toWaitingEntry(row), previousQueueOrder: row.previous_queue_order }
      : null;
  }

  async cancelExpired(
    executor: DatabaseExecutor,
    waitingEntryId: string,
    expectedUpdatedAt: Date,
    cancelledAt: Date,
  ): Promise<WaitingEntry | null> {
    const result = await executor.query<WaitingEntryRow>(
      `
        UPDATE public.waiting_entries
        SET status = 'cancelled',
            cancelled_at = $3,
            lookup_token_hash = NULL,
            updated_at = now()
        WHERE id = $1
          AND source = 'remote'
          AND status = 'entry_requested'
          AND arrival_deadline_at <= $3
          AND updated_at = $2
        RETURNING ${waitingEntryColumns}
      `,
      [waitingEntryId, expectedUpdatedAt, cancelledAt],
    );
    return result.rows[0] ? toWaitingEntry(result.rows[0]) : null;
  }
}
