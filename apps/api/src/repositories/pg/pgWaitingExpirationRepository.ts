import { z } from "zod";
import type { DatabaseExecutor } from "../../db/databaseExecutor.js";
import type {
  WaitingExpirationCandidate,
  WaitingExpirationRepository,
} from "../waitingExpirationRepository.js";

const candidateRowSchema = z.object({
  waiting_entry_id: z.uuid(),
  queue_id: z.uuid(),
  hospital_name: z.string().min(1),
  average_minutes_per_patient: z.number().int().positive(),
  preparation_threshold: z.number().int().positive(),
  entry_threshold: z.number().int().positive(),
});

const lockRowSchema = z.object({ acquired: z.boolean() });

function toCandidate(row: unknown): WaitingExpirationCandidate {
  const candidate = candidateRowSchema.parse(row);
  return {
    waitingEntryId: candidate.waiting_entry_id,
    queueId: candidate.queue_id,
    hospitalName: candidate.hospital_name,
    averageMinutesPerPatient: candidate.average_minutes_per_patient,
    preparationThreshold: candidate.preparation_threshold,
    entryThreshold: candidate.entry_threshold,
  };
}

export class PgWaitingExpirationRepository implements WaitingExpirationRepository {
  async tryAcquireJobLock(executor: DatabaseExecutor): Promise<boolean> {
    const result = await executor.query<{ acquired: boolean }>(
      `SELECT pg_try_advisory_xact_lock(hashtext('baro-jinryo'), hashtext('waiting-expiration')) AS acquired`,
    );
    return lockRowSchema.parse(result.rows[0]).acquired;
  }

  async listExpired(
    executor: DatabaseExecutor,
    now: Date,
  ): Promise<WaitingExpirationCandidate[]> {
    const result = await executor.query(
      `
        SELECT entry.id AS waiting_entry_id, queue.id AS queue_id,
               hospital.name AS hospital_name,
               queue.average_minutes_per_patient,
               queue.preparation_threshold,
               queue.entry_threshold
        FROM public.waiting_entries AS entry
        JOIN public.daily_queues AS queue ON queue.id = entry.queue_id
        JOIN public.hospitals AS hospital ON hospital.id = queue.hospital_id
        WHERE entry.source = 'remote'
          AND entry.status = 'entry_requested'
          AND queue.status IN ('open', 'paused')
          AND entry.arrival_deadline_at <= $1
        ORDER BY entry.arrival_deadline_at ASC, entry.id ASC
      `,
      [now],
    );
    return result.rows.map(toCandidate);
  }

  async listTurnReached(
    executor: DatabaseExecutor,
    now: Date,
  ): Promise<WaitingExpirationCandidate[]> {
    const result = await executor.query(
      `
        SELECT entry.id AS waiting_entry_id, queue.id AS queue_id,
               hospital.name AS hospital_name,
               queue.average_minutes_per_patient,
               queue.preparation_threshold,
               queue.entry_threshold
        FROM public.waiting_entries AS entry
        JOIN public.daily_queues AS queue ON queue.id = entry.queue_id
        JOIN public.hospitals AS hospital ON hospital.id = queue.hospital_id
        WHERE entry.source = 'remote'
          AND entry.status = 'entry_requested'
          AND queue.status IN ('open', 'paused')
          AND entry.no_show_move_count = 0
          AND entry.arrival_deadline_at > $1
          AND NOT EXISTS (
            SELECT 1
            FROM public.waiting_entries AS ahead
            WHERE ahead.queue_id = entry.queue_id
              AND ahead.status IN ('remote_waiting', 'entry_requested', 'onsite_waiting')
              AND ahead.queue_order < entry.queue_order
          )
        ORDER BY queue.queue_date ASC, entry.queue_order ASC, entry.id ASC
      `,
      [now],
    );
    return result.rows.map(toCandidate);
  }
}
