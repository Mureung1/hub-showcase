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
  TransitionWaitingInput,
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
  arrived_patient_count: z.number().int().min(0).max(9).default(0),
  called_patient_count: z.number().int().min(0).max(9).default(0),
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
  version: z.number().int().positive(),
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
  queue_order, patient_count, arrived_patient_count, called_patient_count,
  lookup_token_hash, patient_defer_count,
  no_show_move_count, preparation_notified_at, onsite_near_turn_notified_at,
  entry_requested_at, arrival_deadline_at, called_at, cancelled_at,
  created_at, updated_at, version
`;

const qualifiedWaitingEntryColumns = `
  entry.id, entry.queue_id, entry.account_id, entry.source, entry.phone_number,
  entry.ticket_number, entry.status, entry.queue_order, entry.patient_count,
  entry.arrived_patient_count, entry.called_patient_count,
  entry.lookup_token_hash, entry.patient_defer_count, entry.no_show_move_count,
  entry.preparation_notified_at, entry.onsite_near_turn_notified_at,
  entry.entry_requested_at, entry.arrival_deadline_at, entry.called_at,
  entry.cancelled_at, entry.created_at, entry.updated_at, entry.version
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
    arrivedPatientCount: entry.arrived_patient_count,
    calledPatientCount: entry.called_patient_count,
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
    version: entry.version,
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

  async findByLookupTokenHash(
    executor: DatabaseExecutor,
    lookupTokenHash: string,
  ): Promise<WaitingEntry | null> {
    const result = await executor.query<WaitingEntryRow>(
      `
        SELECT ${waitingEntryColumns}
        FROM public.waiting_entries
        WHERE lookup_token_hash = $1
          AND source = 'onsite'
          AND status NOT IN ('called', 'cancelled')
        LIMIT 1
      `,
      [lookupTokenHash],
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

  async listCountsByQueue(
    executor: DatabaseExecutor,
    queueId: string,
  ): Promise<WaitingEntryCount[]> {
    const result = await executor.query<WaitingEntryCountRow>(
      `
        SELECT count.waiting_entry_id, count.patient_category_id, count.count
        FROM public.waiting_entry_counts AS count
        JOIN public.waiting_entries AS entry ON entry.id = count.waiting_entry_id
        WHERE entry.queue_id = $1
        ORDER BY count.waiting_entry_id, count.patient_category_id
      `,
      [queueId],
    );
    return result.rows.map(toWaitingEntryCount);
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

  async transitionStatus(
    executor: DatabaseExecutor,
    input: TransitionWaitingInput,
  ): Promise<WaitingEntry | null> {
    const result = await executor.query<WaitingEntryRow>(
      `
        UPDATE public.waiting_entries
        SET status = $4::varchar,
            called_at = CASE WHEN $4::varchar = 'called' THEN now() ELSE called_at END,
            cancelled_at = CASE WHEN $4::varchar = 'cancelled' THEN now() ELSE cancelled_at END,
            entry_requested_at = CASE
              WHEN $4::varchar = 'onsite_waiting' THEN NULL ELSE entry_requested_at END,
            arrival_deadline_at = CASE
              WHEN $4::varchar = 'onsite_waiting' THEN NULL ELSE arrival_deadline_at END,
            version = version + 1,
            updated_at = now()
        WHERE id = $1
          AND version = $2
          AND status = ANY($3::varchar[])
        RETURNING ${waitingEntryColumns}
      `,
      [
        input.waitingEntryId,
        input.expectedVersion,
        input.fromStatuses,
        input.toStatus,
      ],
    );
    return result.rows[0] ? toWaitingEntry(result.rows[0]) : null;
  }

  async advanceArrival(
    executor: DatabaseExecutor,
    waitingEntryId: string,
    expectedVersion: number,
  ): Promise<WaitingEntry | null> {
    const result = await executor.query<WaitingEntryRow>(
      `
        UPDATE public.waiting_entries
        SET arrived_patient_count = LEAST(patient_count, arrived_patient_count + 1),
            status = CASE
              WHEN arrived_patient_count + 1 >= patient_count THEN 'onsite_waiting'
              ELSE status
            END,
            entry_requested_at = CASE
              WHEN arrived_patient_count + 1 >= patient_count THEN NULL
              ELSE entry_requested_at
            END,
            arrival_deadline_at = CASE
              WHEN arrived_patient_count + 1 >= patient_count THEN NULL
              ELSE arrival_deadline_at
            END,
            version = version + 1,
            updated_at = now()
        WHERE id = $1
          AND version = $2
          AND status = 'entry_requested'
          AND arrived_patient_count < patient_count
        RETURNING ${waitingEntryColumns}
      `,
      [waitingEntryId, expectedVersion],
    );
    return result.rows[0] ? toWaitingEntry(result.rows[0]) : null;
  }

  async advanceCall(
    executor: DatabaseExecutor,
    waitingEntryId: string,
    expectedVersion: number,
  ): Promise<WaitingEntry | null> {
    const result = await executor.query<WaitingEntryRow>(
      `
        UPDATE public.waiting_entries
        SET called_patient_count = LEAST(patient_count, called_patient_count + 1),
            status = CASE
              WHEN called_patient_count + 1 >= patient_count THEN 'called'
              ELSE status
            END,
            called_at = CASE
              WHEN called_patient_count + 1 >= patient_count THEN now()
              ELSE called_at
            END,
            version = version + 1,
            updated_at = now()
        WHERE id = $1
          AND version = $2
          AND status = 'onsite_waiting'
          AND called_patient_count < patient_count
        RETURNING ${waitingEntryColumns}
      `,
      [waitingEntryId, expectedVersion],
    );
    return result.rows[0] ? toWaitingEntry(result.rows[0]) : null;
  }

  async restoreHeldToEnd(
    executor: DatabaseExecutor,
    waitingEntryId: string,
    expectedVersion: number,
    restoredStatus: "remote_waiting" | "entry_requested" | "onsite_waiting",
  ): Promise<WaitingEntry | null> {
    await executor.query("SELECT id FROM public.daily_queues WHERE id = (SELECT queue_id FROM public.waiting_entries WHERE id = $1) FOR UPDATE", [waitingEntryId]);
    const result = await executor.query<WaitingEntryRow>(
      `
        UPDATE public.waiting_entries AS target
        SET status = $3,
            queue_order = (
              SELECT COALESCE(MAX(active.queue_order), 0) + 1
              FROM public.waiting_entries AS active
              WHERE active.queue_id = target.queue_id
                AND active.status IN ('remote_waiting', 'entry_requested', 'onsite_waiting')
            ),
            version = version + 1,
            updated_at = now()
        WHERE target.id = $1
          AND target.version = $2
          AND target.status = 'held'
        RETURNING ${waitingEntryColumns}
      `,
      [waitingEntryId, expectedVersion, restoredStatus],
    );
    return result.rows[0] ? toWaitingEntry(result.rows[0]) : null;
  }

  async restoreHeldAtPosition(
    executor: DatabaseExecutor,
    waitingEntryId: string,
    expectedVersion: number,
    restoredStatus: "remote_waiting" | "entry_requested" | "onsite_waiting",
    orderedWaitingIds: string[],
  ): Promise<WaitingEntry | null> {
    const target = await this.findById(executor, waitingEntryId);
    if (!target || target.status !== "held" || target.version !== expectedVersion) return null;
    await this.lockQueue(executor, target.queueId);
    const activeIds = (await this.listByQueue(executor, target.queueId))
      .filter(({ status }) => ["remote_waiting", "entry_requested", "onsite_waiting"].includes(status))
      .map(({ id }) => id);
    if (!this.hasSameIds([...activeIds, waitingEntryId], orderedWaitingIds)) return null;

    await this.moveActiveOrdersToTemporaryRange(executor, target.queueId);
    const restored = await executor.query<WaitingEntryRow>(
      `
        UPDATE public.waiting_entries
        SET status = $3, queue_order = 1000000, version = version + 1, updated_at = now()
        WHERE id = $1 AND version = $2 AND status = 'held'
        RETURNING ${waitingEntryColumns}
      `,
      [waitingEntryId, expectedVersion, restoredStatus],
    );
    if (!restored.rows[0]) return null;
    await this.applyActiveOrder(executor, target.queueId, orderedWaitingIds);
    return this.findById(executor, waitingEntryId);
  }

  async reorderActive(
    executor: DatabaseExecutor,
    queueId: string,
    expectedWaitingIds: string[],
    orderedWaitingIds: string[],
  ): Promise<boolean> {
    await this.lockQueue(executor, queueId);
    const activeIds = (await this.listByQueue(executor, queueId))
      .filter(({ status }) => ["remote_waiting", "entry_requested", "onsite_waiting"].includes(status))
      .map(({ id }) => id);
    if (!this.hasSameOrder(activeIds, expectedWaitingIds)) return false;
    if (!this.hasSameIds(activeIds, orderedWaitingIds)) return false;
    await this.moveActiveOrdersToTemporaryRange(executor, queueId);
    await this.applyActiveOrder(executor, queueId, orderedWaitingIds);
    return true;
  }

  private async lockQueue(executor: DatabaseExecutor, queueId: string): Promise<void> {
    await executor.query("SELECT id FROM public.daily_queues WHERE id = $1 FOR UPDATE", [queueId]);
  }

  private async moveActiveOrdersToTemporaryRange(executor: DatabaseExecutor, queueId: string): Promise<void> {
    await executor.query(
      `UPDATE public.waiting_entries
       SET queue_order = queue_order + 1000000
       WHERE queue_id = $1
         AND status IN ('remote_waiting', 'entry_requested', 'onsite_waiting')`,
      [queueId],
    );
  }

  private async applyActiveOrder(
    executor: DatabaseExecutor,
    queueId: string,
    orderedWaitingIds: string[],
  ): Promise<void> {
    await executor.query(
      `
        UPDATE public.waiting_entries AS entry
        SET queue_order = requested.position,
            version = version + 1,
            updated_at = now()
        FROM unnest($2::uuid[]) WITH ORDINALITY AS requested(id, position)
        WHERE entry.queue_id = $1
          AND entry.id = requested.id
          AND entry.status IN ('remote_waiting', 'entry_requested', 'onsite_waiting')
      `,
      [queueId, orderedWaitingIds],
    );
  }

  private hasSameIds(actual: string[], requested: string[]): boolean {
    return actual.length === requested.length && new Set(actual).size === actual.length &&
      actual.every((id) => requested.includes(id));
  }

  private hasSameOrder(actual: string[], expected: string[]): boolean {
    return actual.length === expected.length && actual.every((id, index) => id === expected[index]);
  }

  async deferRemoteToEnd(
    executor: DatabaseExecutor,
    waitingEntryId: string,
    expectedVersion: number,
  ): Promise<WaitingEntry | null> {
    await executor.query(
      "SELECT id FROM public.daily_queues WHERE id = (SELECT queue_id FROM public.waiting_entries WHERE id = $1) FOR UPDATE",
      [waitingEntryId],
    );
    const result = await executor.query<WaitingEntryRow>(
      `
        UPDATE public.waiting_entries AS target
        SET status = 'remote_waiting',
            queue_order = (
              SELECT COALESCE(MAX(active.queue_order), 0) + 1
              FROM public.waiting_entries AS active
              WHERE active.queue_id = target.queue_id
                AND active.status IN ('remote_waiting', 'entry_requested', 'onsite_waiting')
                AND active.id <> target.id
            ),
            patient_defer_count = 1,
            entry_requested_at = NULL,
            arrival_deadline_at = NULL,
            version = version + 1,
            updated_at = now()
        WHERE target.id = $1
          AND target.version = $2
          AND target.source = 'remote'
          AND target.status IN ('remote_waiting', 'entry_requested')
          AND target.patient_defer_count = 0
        RETURNING ${waitingEntryColumns}
      `,
      [waitingEntryId, expectedVersion],
    );
    return result.rows[0] ? toWaitingEntry(result.rows[0]) : null;
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
    expectedVersion: number,
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
            AND version = $2
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
              updated_at = now(),
              version = entry.version + 1
          FROM target, last_order
          WHERE entry.id = target.id
            AND NOT EXISTS (
              SELECT 1
              FROM public.waiting_entries AS ahead
              WHERE ahead.queue_id = target.queue_id
                AND ahead.status IN ('remote_waiting', 'entry_requested', 'onsite_waiting')
                AND ahead.queue_order < target.queue_order
            )
          RETURNING ${qualifiedWaitingEntryColumns}
        )
        SELECT moved.*, target.queue_order AS previous_queue_order
        FROM moved
        CROSS JOIN target
      `,
      [waitingEntryId, expectedVersion],
    );
    const row = result.rows[0];
    return row
      ? { waiting: toWaitingEntry(row), previousQueueOrder: row.previous_queue_order }
      : null;
  }

  async cancelExpired(
    executor: DatabaseExecutor,
    waitingEntryId: string,
    expectedVersion: number,
    cancelledAt: Date,
  ): Promise<WaitingEntry | null> {
    const result = await executor.query<WaitingEntryRow>(
      `
        UPDATE public.waiting_entries
        SET status = 'cancelled',
            cancelled_at = $3,
            lookup_token_hash = NULL,
            updated_at = now(),
            version = version + 1
        WHERE id = $1
          AND source = 'remote'
          AND status = 'entry_requested'
          AND arrival_deadline_at <= $3
          AND version = $2
        RETURNING ${waitingEntryColumns}
      `,
      [waitingEntryId, expectedVersion, cancelledAt],
    );
    return result.rows[0] ? toWaitingEntry(result.rows[0]) : null;
  }
}
