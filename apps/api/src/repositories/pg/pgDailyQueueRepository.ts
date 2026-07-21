import { queueStatusSchema } from "@baro-jinryo/shared";
import { z } from "zod";
import type { DatabaseExecutor } from "../../db/databaseExecutor.js";
import type {
  CreateDailyQueueInput,
  DailyQueue,
  DailyQueueRepository,
} from "../dailyQueueRepository.js";

const dailyQueueRowSchema = z.object({
  id: z.uuid(),
  hospital_id: z.uuid(),
  category_set_id: z.uuid(),
  queue_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  status: queueStatusSchema,
  average_minutes_per_patient: z.number().int().positive(),
  preparation_threshold: z.number().int().positive(),
  entry_threshold: z.number().int().positive(),
  arrival_grace_minutes: z.number().int().positive(),
  max_remote_waiting_patients: z.number().int().positive(),
  next_ticket_number: z.number().int().positive(),
  opened_at: z.date().nullable(),
  closed_at: z.date().nullable(),
  created_at: z.date(),
  updated_at: z.date(),
});

type DailyQueueRow = z.infer<typeof dailyQueueRowSchema>;

const dailyQueueColumns = `
  id, hospital_id, category_set_id, queue_date, status,
  average_minutes_per_patient, preparation_threshold, entry_threshold,
  arrival_grace_minutes, max_remote_waiting_patients, opened_at, closed_at,
  next_ticket_number, created_at, updated_at
`;

function toDailyQueue(row: unknown): DailyQueue {
  const queue = dailyQueueRowSchema.parse(row);
  return {
    id: queue.id,
    hospitalId: queue.hospital_id,
    categorySetId: queue.category_set_id,
    queueDate: queue.queue_date,
    status: queue.status,
    averageMinutesPerPatient: queue.average_minutes_per_patient,
    preparationThreshold: queue.preparation_threshold,
    entryThreshold: queue.entry_threshold,
    arrivalGraceMinutes: queue.arrival_grace_minutes,
    maxRemoteWaitingPatients: queue.max_remote_waiting_patients,
    nextTicketNumber: queue.next_ticket_number,
    openedAt: queue.opened_at,
    closedAt: queue.closed_at,
    createdAt: queue.created_at,
    updatedAt: queue.updated_at,
  };
}

export class PgDailyQueueRepository implements DailyQueueRepository {
  async findById(executor: DatabaseExecutor, id: string): Promise<DailyQueue | null> {
    const result = await executor.query<DailyQueueRow>(
      `SELECT ${dailyQueueColumns} FROM public.daily_queues WHERE id = $1`,
      [id],
    );
    return result.rows[0] ? toDailyQueue(result.rows[0]) : null;
  }

  async findByHospitalAndDate(
    executor: DatabaseExecutor,
    hospitalId: string,
    queueDate: string,
  ): Promise<DailyQueue | null> {
    const result = await executor.query<DailyQueueRow>(
      `
        SELECT ${dailyQueueColumns}
        FROM public.daily_queues
        WHERE hospital_id = $1 AND queue_date = $2
      `,
      [hospitalId, queueDate],
    );
    return result.rows[0] ? toDailyQueue(result.rows[0]) : null;
  }

  async createOpen(
    executor: DatabaseExecutor,
    input: CreateDailyQueueInput,
  ): Promise<DailyQueue> {
    const result = await executor.query<DailyQueueRow>(
      `
        INSERT INTO public.daily_queues
          (hospital_id, category_set_id, queue_date, status, opened_at)
        VALUES ($1, $2, $3, 'open', now())
        ON CONFLICT (hospital_id, queue_date) DO UPDATE
        SET status = 'open',
            opened_at = COALESCE(public.daily_queues.opened_at, now()),
            closed_at = NULL
        RETURNING ${dailyQueueColumns}
      `,
      [input.hospitalId, input.categorySetId, input.queueDate],
    );
    const row = result.rows[0];
    if (!row) throw new Error("날짜별 대기열 생성 결과를 찾을 수 없습니다.");
    return toDailyQueue(row);
  }

  async createPaused(
    executor: DatabaseExecutor,
    input: CreateDailyQueueInput,
  ): Promise<DailyQueue> {
    const result = await executor.query<DailyQueueRow>(
      `
        INSERT INTO public.daily_queues
          (hospital_id, category_set_id, queue_date, status)
        VALUES ($1, $2, $3, 'paused')
        ON CONFLICT (hospital_id, queue_date) DO UPDATE
        SET category_set_id = public.daily_queues.category_set_id
        RETURNING ${dailyQueueColumns}
      `,
      [input.hospitalId, input.categorySetId, input.queueDate],
    );
    const row = result.rows[0];
    if (!row) throw new Error("날짜별 대기열 생성 결과를 찾을 수 없습니다.");
    return toDailyQueue(row);
  }

  async setStatus(
    executor: DatabaseExecutor,
    queueId: string,
    status: "open" | "paused" | "closed",
  ): Promise<DailyQueue | null> {
    const result = await executor.query<DailyQueueRow>(
      `
        UPDATE public.daily_queues
        SET status = $2::varchar,
            opened_at = CASE
              WHEN $2::varchar = 'open' AND opened_at IS NULL THEN now()
              ELSE opened_at
            END,
            closed_at = CASE WHEN $2::varchar = 'closed' THEN now() ELSE NULL END
        WHERE id = $1
        RETURNING ${dailyQueueColumns}
      `,
      [queueId, status],
    );
    return result.rows[0] ? toDailyQueue(result.rows[0]) : null;
  }
}
