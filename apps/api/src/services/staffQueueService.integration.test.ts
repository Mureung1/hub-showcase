import { describe, expect, it } from "vitest";
import { databasePool } from "../db/pool.js";
import type { DatabaseExecutor } from "../db/databaseExecutor.js";
import {
  PgTransactionManager,
  type TransactionManager,
} from "../db/transactionManager.js";
import { MockNotificationProvider } from "../notifications/mockNotificationProvider.js";
import { PgDailyQueueRepository } from "../repositories/pg/pgDailyQueueRepository.js";
import { PgHospitalRepository } from "../repositories/pg/pgHospitalRepository.js";
import { PgNotificationRepository } from "../repositories/pg/pgNotificationRepository.js";
import { PgPatientCategoryRepository } from "../repositories/pg/pgPatientCategoryRepository.js";
import { PgWaitingEventRepository } from "../repositories/pg/pgWaitingEventRepository.js";
import { PgWaitingRepository } from "../repositories/pg/pgWaitingRepository.js";
import { NotificationService } from "./notificationService.js";
import { AutomaticNotificationService } from "./automaticNotificationService.js";
import { StaffQueueService } from "./staffQueueService.js";

class ScopedTransactionManager implements TransactionManager {
  constructor(private readonly executor: DatabaseExecutor) {}

  async run<Result>(work: (executor: DatabaseExecutor) => Promise<Result>) {
    return work(this.executor);
  }
}

describe("StaffQueueService development Supabase vertical slice", () => {
  it("현장 환자를 저장하고 오늘 대기열에서 다시 조회한 뒤 롤백한다", async () => {
    const outerTransaction = new PgTransactionManager(databasePool);
    let waitingId = "";

    await expect(
      outerTransaction.run(async (executor) => {
        const hospitalResult = await executor.query<{ id: string }>(
          `
            INSERT INTO public.hospitals
              (name, primary_department, phone_number, region_sido,
               region_sigungu, address, approval_status, approved_at)
            VALUES
              ('수직 슬라이스 테스트 병원', '이비인후과', '+82200000004',
               '서울특별시', '테스트구', '롤백되는 테스트 주소', 'approved', now())
            RETURNING id
          `,
        );
        const hospitalId = hospitalResult.rows[0]?.id;
        if (!hospitalId) throw new Error("테스트 병원 생성 결과가 없습니다.");
        const categoryResult = await executor.query<{ id: string }>(
          `
            INSERT INTO public.patient_category_sets
              (hospital_id, input_mode, effective_date, status)
            VALUES ($1, 'total_only', '2026-07-16', 'active')
            RETURNING id
          `,
          [hospitalId],
        );
        const categorySetId = categoryResult.rows[0]?.id;
        if (!categorySetId) throw new Error("테스트 분류 설정 생성 결과가 없습니다.");
        const waitingRepository = new PgWaitingRepository();
        const waitingEventRepository = new PgWaitingEventRepository();
        const notificationRepository = new PgNotificationRepository();
        const notificationService = new NotificationService(
          notificationRepository,
          new MockNotificationProvider(),
        );
        const service = new StaffQueueService(
          new ScopedTransactionManager(executor),
          new PgDailyQueueRepository(),
          new PgHospitalRepository(),
          new PgPatientCategoryRepository(),
          waitingRepository,
          waitingEventRepository,
          notificationRepository,
          notificationService,
          new AutomaticNotificationService(
            waitingRepository,
            waitingEventRepository,
            notificationService,
          ),
          {
            patientWebOrigin: "http://127.0.0.1:5173",
            getClinicDate: () => "2026-07-16",
          },
        );

        await expect(service.getTodayQueue(hospitalId)).resolves.toMatchObject({
          entries: [],
          queueDate: "2026-07-16",
          queueStatus: "paused",
          todayInputMode: "total_only",
        });
        const configuredQueue = await service.saveNextDayConfiguration(hospitalId, {
          inputMode: "categorized",
          categories: [
            {
              id: "client-generated-id",
              name: "Adult",
              description: "Age 19 or older",
              sortOrder: 0,
            },
          ],
        });
        expect(configuredQueue).toMatchObject({
          todayInputMode: "total_only",
          todayCategories: [],
          nextDayInputMode: "categorized",
          nextDayCategories: [
            expect.objectContaining({
              name: "Adult",
              description: "Age 19 or older",
              sortOrder: 0,
            }),
          ],
        });
        expect(configuredQueue.nextDayCategories[0]?.id).not.toBe("client-generated-id");
        const registration = await service.registerOnsite(hospitalId, {
          phoneNumber: "+821012345678",
          registration: { inputMode: "total_only", totalCount: 3 },
        });
        waitingId = registration.queue.entries[0]?.id ?? "";
        const reloaded = await service.getTodayQueue(hospitalId);
        const stored = await executor.query<{
          account_id: string | null;
          source: string;
          status: string;
          patient_count: number;
          lookup_token_hash: string | null;
        }>(
          `
            SELECT account_id, source, status, patient_count, lookup_token_hash
            FROM public.waiting_entries
            WHERE id = $1
          `,
          [waitingId],
        );
        const notificationLog = await executor.query<{ payload: Record<string, unknown> }>(
          `SELECT payload FROM public.notification_logs
           WHERE waiting_entry_id = $1 AND notification_type = 'onsite_registered'`,
          [waitingId],
        );

        expect(registration.notification.templateCode).toBe("onsite_registered");
        expect(reloaded.queueStatus).toBe("paused");
        expect(reloaded.entries).toContainEqual(
          expect.objectContaining({
            id: waitingId,
            source: "onsite",
            status: "onsite_waiting",
            patientCount: 3,
          }),
        );
        expect(stored.rows[0]).toMatchObject({
          account_id: null,
          source: "onsite",
          status: "onsite_waiting",
          patient_count: 3,
        });
        expect(stored.rows[0]?.lookup_token_hash).toMatch(/^[a-f0-9]{64}$/);
        expect(notificationLog.rows[0]?.payload).toMatchObject({
          hospitalName: "수직 슬라이스 테스트 병원",
          statusUrl: "[REDACTED]",
        });
        const queueResult = await executor.query<{ id: string; status: string }>(
          `SELECT id, status FROM public.daily_queues
           WHERE hospital_id = $1 AND queue_date = '2026-07-16'`,
          [hospitalId],
        );
        const queueId = queueResult.rows[0]?.id;
        if (!queueId) throw new Error("현장 접수로 생성된 테스트 대기열이 없습니다.");
        expect(queueResult.rows).toHaveLength(1);
        expect(queueResult.rows[0]?.status).toBe("paused");
        await expect(
          new PgWaitingRepository().sumActiveRemotePatients(executor, queueId),
        ).resolves.toBe(0);

        const openedQueue = await service.setQueueStatus(hospitalId, "open");
        expect(openedQueue.queueStatus).toBe("open");
        const openedQueueResult = await executor.query<{ id: string; status: string }>(
          `SELECT id, status FROM public.daily_queues
           WHERE hospital_id = $1 AND queue_date = '2026-07-16'`,
          [hospitalId],
        );
        expect(openedQueueResult.rows).toHaveLength(1);
        expect(openedQueueResult.rows[0]).toMatchObject({ id: queueId, status: "open" });

        const heldQueue = await service.holdWaiting(hospitalId, waitingId, null);
        expect(heldQueue.entries.find(({ id }) => id === waitingId)?.status).toBe("held");
        const restoredQueue = await service.restoreWaiting(hospitalId, waitingId, null);
        expect(restoredQueue.entries.find(({ id }) => id === waitingId)?.status).toBe(
          "onsite_waiting",
        );
        const calledQueue = await service.changeWaitingStatus(
          hospitalId,
          waitingId,
          "called",
          null,
        );
        expect(calledQueue.entries.find(({ id }) => id === waitingId)?.status).toBe("called");
        const calledStored = await executor.query<{ lookup_token_hash: string | null }>(
          "SELECT lookup_token_hash FROM public.waiting_entries WHERE id = $1",
          [waitingId],
        );
        expect(calledStored.rows[0]?.lookup_token_hash).toBeNull();

        const second = await service.registerOnsite(hospitalId, {
          phoneNumber: "+821012345670",
          registration: { inputMode: "total_only", totalCount: 1 },
        });
        const secondId = second.queue.entries.find(({ status }) => status === "onsite_waiting")?.id;
        if (!secondId) throw new Error("두 번째 현장 접수 결과가 없습니다.");
        const third = await service.registerOnsite(hospitalId, {
          phoneNumber: "+821012345672",
          registration: { inputMode: "total_only", totalCount: 1 },
        });
        const thirdId = third.queue.entries.find(
          ({ id, status }) => id !== secondId && status === "onsite_waiting",
        )?.id;
        if (!thirdId) throw new Error("세 번째 현장 접수 결과가 없습니다.");
        const reordered = await service.reorderWaitings(
          hospitalId,
          [secondId, thirdId],
          [thirdId, secondId],
          null,
        );
        expect(reordered.entries.filter(({ status }) => status === "onsite_waiting").map(({ id }) => id))
          .toEqual([thirdId, secondId]);
        await expect(
          service.reorderWaitings(
            hospitalId,
            [secondId, thirdId],
            [secondId, thirdId],
            null,
          ),
        ).rejects.toMatchObject({
          code: "QUEUE_ORDER_CONFLICT",
        });
        await service.holdWaiting(hospitalId, thirdId, null);
        const restoredAtFirst = await service.restoreWaiting(hospitalId, thirdId, null, 1);
        expect(restoredAtFirst.entries.filter(({ status }) => status === "onsite_waiting").map(({ id }) => id))
          .toEqual([thirdId, secondId]);
        await service.changeWaitingStatus(
          hospitalId,
          secondId,
          "cancelled",
          null,
          "환자 요청",
        );
        const events = await new PgWaitingEventRepository().listByWaitingEntry(
          executor,
          secondId,
        );
        expect([...events].reverse().find(({ eventType }) => eventType === "cancelled")).toMatchObject({
          eventType: "cancelled",
          fromStatus: "onsite_waiting",
          toStatus: "cancelled",
          metadata: { reason: "환자 요청" },
        });

        await service.setQueueStatus(hospitalId, "closed");
        await expect(
          service.registerOnsite(hospitalId, {
            phoneNumber: "+821012345671",
            registration: { inputMode: "total_only", totalCount: 1 },
          }),
        ).rejects.toMatchObject({ code: "QUEUE_CLOSED" });
        throw new Error("ROLLBACK_TEST");
      }),
    ).rejects.toThrow("ROLLBACK_TEST");

    expect(waitingId).not.toBe("");
    const result = await databasePool.query(
      "SELECT id FROM public.waiting_entries WHERE id = $1",
      [waitingId],
    );
    expect(result.rows).toHaveLength(0);
  });
});
