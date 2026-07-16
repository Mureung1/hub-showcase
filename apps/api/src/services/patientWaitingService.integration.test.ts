import { describe, expect, it } from "vitest";
import type { DatabaseExecutor } from "../db/databaseExecutor.js";
import { databasePool } from "../db/pool.js";
import { PgTransactionManager, type TransactionManager } from "../db/transactionManager.js";
import { MockNotificationProvider } from "../notifications/mockNotificationProvider.js";
import { PgDailyQueueRepository } from "../repositories/pg/pgDailyQueueRepository.js";
import { PgHospitalRepository } from "../repositories/pg/pgHospitalRepository.js";
import { PgNotificationRepository } from "../repositories/pg/pgNotificationRepository.js";
import { PgPatientCategoryRepository } from "../repositories/pg/pgPatientCategoryRepository.js";
import { PgProfileRepository } from "../repositories/pg/pgProfileRepository.js";
import { PgWaitingEventRepository } from "../repositories/pg/pgWaitingEventRepository.js";
import { PgWaitingRepository } from "../repositories/pg/pgWaitingRepository.js";
import { NotificationService } from "./notificationService.js";
import { PatientWaitingService } from "./patientWaitingService.js";

class ScopedTransactionManager implements TransactionManager {
  constructor(private readonly executor: DatabaseExecutor) {}
  async run<Result>(work: (executor: DatabaseExecutor) => Promise<Result>) {
    await this.executor.query("SAVEPOINT patient_service_call");
    try {
      const result = await work(this.executor);
      await this.executor.query("RELEASE SAVEPOINT patient_service_call");
      return result;
    } catch (error) {
      await this.executor.query("ROLLBACK TO SAVEPOINT patient_service_call");
      await this.executor.query("RELEASE SAVEPOINT patient_service_call");
      throw error;
    }
  }
}

describe("PatientWaitingService development Supabase vertical slice", () => {
  it("원격 접수를 저장·조회·미루기·취소하고 전체 테스트 데이터를 롤백한다", async () => {
    const outerTransaction = new PgTransactionManager(databasePool);
    let waitingId = "";

    await expect(outerTransaction.run(async (executor) => {
      const authResult = await executor.query<{ id: string }>(`
        INSERT INTO auth.users
          (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
           raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
           confirmation_token, email_change, email_change_token_new, recovery_token)
        VALUES
          ('00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated',
           'authenticated', 'patient-slice-' || gen_random_uuid() || '@example.com', '', now(),
           '{"provider":"email","providers":["email"]}', '{}', now(), now(), '', '', '', '')
        RETURNING id
      `);
      const accountId = authResult.rows[0]?.id;
      if (!accountId) throw new Error("테스트 인증 사용자 생성 결과가 없습니다.");
      const secondAuthResult = await executor.query<{ id: string }>(`
        INSERT INTO auth.users
          (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
           raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
           confirmation_token, email_change, email_change_token_new, recovery_token)
        VALUES
          ('00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated',
           'authenticated', 'patient-capacity-' || gen_random_uuid() || '@example.com', '', now(),
           '{"provider":"email","providers":["email"]}', '{}', now(), now(), '', '', '', '')
        RETURNING id
      `);
      const secondAccountId = secondAuthResult.rows[0]?.id;
      if (!secondAccountId) throw new Error("두 번째 테스트 인증 사용자 생성 결과가 없습니다.");
      await executor.query(
        `INSERT INTO public.profiles (id, phone_number, account_type)
         VALUES ($1, '+821055501234', 'patient'), ($2, '+821055501235', 'patient')`,
        [accountId, secondAccountId],
      );
      const hospitalResult = await executor.query<{ id: string }>(`
        INSERT INTO public.hospitals
          (name, primary_department, phone_number, region_sido, region_sigungu,
           address, approval_status, approved_at)
        VALUES ('환자 수직 슬라이스 병원', '이비인후과', '+8225550123',
                '서울특별시', '테스트구', '롤백 테스트 주소', 'approved', now())
        RETURNING id
      `);
      const hospitalId = hospitalResult.rows[0]?.id;
      if (!hospitalId) throw new Error("테스트 병원 생성 결과가 없습니다.");
      const categoryResult = await executor.query<{ id: string }>(`
        INSERT INTO public.patient_category_sets
          (hospital_id, input_mode, effective_date, status)
        VALUES ($1, 'total_only', '2026-07-16', 'active') RETURNING id
      `, [hospitalId]);
      const categorySetId = categoryResult.rows[0]?.id;
      if (!categorySetId) throw new Error("테스트 분류 설정 생성 결과가 없습니다.");
      await executor.query(`
        INSERT INTO public.daily_queues
          (hospital_id, category_set_id, queue_date, status, opened_at, max_remote_waiting_patients)
        VALUES ($1, $2, '2026-07-16', 'open', now(), 5)
      `, [hospitalId, categorySetId]);

      const waitingRepository = new PgWaitingRepository();
      const service = new PatientWaitingService(
        new ScopedTransactionManager(executor),
        new PgProfileRepository(),
        new PgHospitalRepository(),
        new PgDailyQueueRepository(),
        new PgPatientCategoryRepository(),
        waitingRepository,
        new PgWaitingEventRepository(),
        new NotificationService(new PgNotificationRepository(), new MockNotificationProvider()),
        { patientWebOrigin: "http://127.0.0.1:5173", getClinicDate: () => "2026-07-16" },
      );

      const registered = await service.register(accountId, hospitalId, {
        inputMode: "total_only",
        totalCount: 3,
      });
      waitingId = registered.entry.id;
      expect(registered.entry).toMatchObject({
        source: "remote",
        status: "remote_waiting",
        patientCount: 3,
      });
      expect((await service.getActive(accountId))?.entry.id).toBe(waitingId);
      await expect(service.register(accountId, hospitalId, {
        inputMode: "total_only",
        totalCount: 1,
      })).rejects.toMatchObject({ code: "ACTIVE_REMOTE_WAITING_EXISTS" });
      await expect(service.register(secondAccountId, hospitalId, {
        inputMode: "total_only",
        totalCount: 3,
      })).rejects.toMatchObject({ code: "REMOTE_CAPACITY_EXCEEDED" });
      const queueAfterRejectedRegistration = await executor.query<{ next_ticket_number: number }>(
        "SELECT next_ticket_number FROM public.daily_queues WHERE hospital_id = $1 AND queue_date = '2026-07-16'",
        [hospitalId],
      );
      expect(queueAfterRejectedRegistration.rows[0]?.next_ticket_number).toBe(2);

      const stored = await waitingRepository.findById(executor, waitingId);
      expect(stored?.phoneNumber).toBe("+821055501234");
      const deferred = await service.defer(accountId);
      expect(deferred.entry.deferred).toBe(true);
      await expect(service.defer(accountId)).rejects.toMatchObject({ code: "PATIENT_DEFER_ALREADY_USED" });
      const cancelled = await service.cancel(accountId);
      expect(cancelled.entry.status).toBe("cancelled");
      await expect(service.getActive(accountId)).resolves.toBeNull();

      const events = await new PgWaitingEventRepository().listByWaitingEntry(executor, waitingId);
      expect(events.map(({ eventType }) => eventType).sort()).toEqual(["cancelled", "deferred", "registered"]);
      const notification = await executor.query(
        "SELECT id FROM public.notification_logs WHERE waiting_entry_id = $1 AND notification_type = 'remote_registered'",
        [waitingId],
      );
      expect(notification.rows).toHaveLength(1);
      throw new Error("ROLLBACK_TEST");
    })).rejects.toThrow("ROLLBACK_TEST");

    expect(waitingId).not.toBe("");
    const result = await databasePool.query("SELECT id FROM public.waiting_entries WHERE id = $1", [waitingId]);
    expect(result.rows).toHaveLength(0);
  });
});
