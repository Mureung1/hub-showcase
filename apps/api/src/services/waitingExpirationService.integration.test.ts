import { describe, expect, it } from "vitest";
import type { DatabaseExecutor } from "../db/databaseExecutor.js";
import { databasePool } from "../db/pool.js";
import { PgTransactionManager, type TransactionManager } from "../db/transactionManager.js";
import { MockNotificationProvider } from "../notifications/mockNotificationProvider.js";
import { PgNotificationRepository } from "../repositories/pg/pgNotificationRepository.js";
import { PgWaitingEventRepository } from "../repositories/pg/pgWaitingEventRepository.js";
import { PgWaitingExpirationRepository } from "../repositories/pg/pgWaitingExpirationRepository.js";
import { PgWaitingRepository } from "../repositories/pg/pgWaitingRepository.js";
import { AutomaticNotificationService } from "./automaticNotificationService.js";
import { NotificationService } from "./notificationService.js";
import { WaitingExpirationService } from "./waitingExpirationService.js";

class ScopedTransactionManager implements TransactionManager {
  constructor(private readonly executor: DatabaseExecutor) {}
  async run<Result>(work: (executor: DatabaseExecutor) => Promise<Result>) {
    return work(this.executor);
  }
}

function createService(transactionManager: TransactionManager) {
  const waitingRepository = new PgWaitingRepository();
  const waitingEventRepository = new PgWaitingEventRepository();
  const notificationService = new NotificationService(
    new PgNotificationRepository(),
    new MockNotificationProvider(),
  );
  return new WaitingExpirationService(
    transactionManager,
    new PgWaitingExpirationRepository(),
    waitingRepository,
    waitingEventRepository,
    notificationService,
    new AutomaticNotificationService(
      waitingRepository,
      waitingEventRepository,
      notificationService,
    ),
    { patientWebOrigin: "http://127.0.0.1:5173" },
  );
}

describe("WaitingExpirationService development Supabase integration", () => {
  it("잠금 하나로 만료 취소와 마지막 이동을 한 번만 처리하고 롤백한다", async () => {
    const outerTransaction = new PgTransactionManager(databasePool);
    const now = new Date("2026-07-21T07:00:00.000Z");
    let expiredWaitingId = "";
    let turnReachedWaitingId = "";

    await expect(
      outerTransaction.run(async (executor) => {
        const accountResult = await executor.query<{ id: string }>(`
          INSERT INTO auth.users
            (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
             raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
             confirmation_token, email_change, email_change_token_new, recovery_token)
          SELECT
            '00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated',
            'authenticated', 'expiration-' || suffix || '-' || gen_random_uuid() || '@example.com',
            '', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now(),
            '', '', '', ''
          FROM unnest(ARRAY['expired', 'turn']) AS generated(suffix)
          RETURNING id
        `);
        const accountIds = accountResult.rows.map(({ id }) => id);
        if (accountIds.length !== 2) throw new Error("테스트 계정 생성 결과가 없습니다.");
        await executor.query(
          `INSERT INTO public.profiles (id, phone_number, account_type)
           VALUES ($1, '+821055501241', 'patient'), ($2, '+821055501242', 'patient')`,
          accountIds,
        );
        const hospitalResult = await executor.query<{ id: string }>(`
          INSERT INTO public.hospitals
            (name, primary_department, phone_number, region_sido, region_sigungu,
             address, approval_status, approved_at)
          VALUES ('자동 만료 통합 테스트 병원', '이비인후과', '+8225550241',
                  '서울특별시', '테스트구', '롤백 테스트 주소', 'approved', now())
          RETURNING id
        `);
        const hospitalId = hospitalResult.rows[0]?.id;
        if (!hospitalId) throw new Error("테스트 병원 생성 결과가 없습니다.");
        const categoryResult = await executor.query<{ id: string }>(
          `INSERT INTO public.patient_category_sets
             (hospital_id, input_mode, effective_date, status)
           VALUES ($1, 'total_only', '2026-07-20', 'active')
           RETURNING id`,
          [hospitalId],
        );
        const categorySetId = categoryResult.rows[0]?.id;
        if (!categorySetId) throw new Error("테스트 분류 설정 생성 결과가 없습니다.");
        const queueResult = await executor.query<{ id: string }>(
          `INSERT INTO public.daily_queues
             (hospital_id, category_set_id, queue_date, status, opened_at)
           VALUES
             ($1, $2, '2026-07-20', 'open', now()),
             ($1, $2, '2026-07-21', 'open', now())
           RETURNING id, queue_date`,
          [hospitalId, categorySetId],
        );
        if (queueResult.rows.length !== 2) throw new Error("테스트 대기열 생성 결과가 없습니다.");
        const waitingResult = await executor.query<{ id: string; ticket_number: string }>(
          `INSERT INTO public.waiting_entries
             (queue_id, account_id, source, phone_number, ticket_number, status,
              queue_order, patient_count, entry_requested_at, arrival_deadline_at)
           VALUES
             ($1, $3, 'remote', '+821055501241', 'expired', 'entry_requested',
              1, 1, $5::timestamptz - interval '20 minutes',
              $5::timestamptz - interval '1 minute'),
             ($2, $4, 'remote', '+821055501242', 'turn', 'entry_requested',
              1, 1, $5::timestamptz - interval '10 minutes',
              $5::timestamptz + interval '10 minutes')
           RETURNING id, ticket_number`,
          [queueResult.rows[0]?.id, queueResult.rows[1]?.id, ...accountIds, now],
        );
        expiredWaitingId =
          waitingResult.rows.find(({ ticket_number }) => ticket_number === "expired")?.id ?? "";
        turnReachedWaitingId =
          waitingResult.rows.find(({ ticket_number }) => ticket_number === "turn")?.id ?? "";
        if (!expiredWaitingId || !turnReachedWaitingId) {
          throw new Error("테스트 웨이팅 생성 결과가 없습니다.");
        }

        const service = createService(new ScopedTransactionManager(executor));
        const firstRun = await service.run(now);
        expect(firstRun).toEqual({
          lockAcquired: true,
          cancelledCount: 1,
          movedCount: 1,
        });
        await expect(
          createService(new PgTransactionManager(databasePool)).run(now),
        ).resolves.toEqual({
          lockAcquired: false,
          cancelledCount: 0,
          movedCount: 0,
        });

        const stored = await executor.query<{
          id: string;
          status: string;
          no_show_move_count: number;
        }>(
          `SELECT id, status, no_show_move_count
           FROM public.waiting_entries
           WHERE id = ANY($1::uuid[])
           ORDER BY ticket_number`,
          [[expiredWaitingId, turnReachedWaitingId]],
        );
        expect(stored.rows).toEqual([
          expect.objectContaining({
            id: expiredWaitingId,
            status: "cancelled",
            no_show_move_count: 0,
          }),
          expect.objectContaining({
            id: turnReachedWaitingId,
            status: "entry_requested",
            no_show_move_count: 1,
          }),
        ]);
        const events = await executor.query<{ event_type: string; count: string }>(
          `SELECT event_type, count(*)::text AS count
           FROM public.waiting_events
           WHERE waiting_entry_id = ANY($1::uuid[])
           GROUP BY event_type
           ORDER BY event_type`,
          [[expiredWaitingId, turnReachedWaitingId]],
        );
        expect(events.rows).toEqual([
          { event_type: "cancelled", count: "1" },
          { event_type: "no_show_moved", count: "1" },
        ]);
        const notifications = await executor.query<{ count: string }>(
          `SELECT count(*)::text AS count
           FROM public.notification_logs
           WHERE waiting_entry_id = $1 AND notification_type = 'cancelled'`,
          [expiredWaitingId],
        );
        expect(notifications.rows[0]?.count).toBe("1");
        throw new Error("ROLLBACK_TEST");
      }),
    ).rejects.toThrow("ROLLBACK_TEST");

    expect(expiredWaitingId).not.toBe("");
    const remaining = await databasePool.query(
      "SELECT id FROM public.waiting_entries WHERE id = ANY($1::uuid[])",
      [[expiredWaitingId, turnReachedWaitingId]],
    );
    expect(remaining.rows).toHaveLength(0);
  });
});
