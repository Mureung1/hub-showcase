import { describe, expect, it } from "vitest";
import { databasePool } from "../../db/pool.js";
import { PgTransactionManager } from "../../db/transactionManager.js";
import { PgDailyQueueRepository } from "./pgDailyQueueRepository.js";
import { PgHospitalRepository } from "./pgHospitalRepository.js";
import { PgNotificationRepository } from "./pgNotificationRepository.js";
import { PgWaitingRepository } from "./pgWaitingRepository.js";

describe("PgNotificationRepository development Supabase integration", () => {
  it("발송 결과와 중복 방지 키를 저장한 뒤 전체 테스트 데이터를 롤백한다", async () => {
    const hospitalRepository = new PgHospitalRepository();
    const queueRepository = new PgDailyQueueRepository();
    const waitingRepository = new PgWaitingRepository();
    const notificationRepository = new PgNotificationRepository();
    const transactionManager = new PgTransactionManager(databasePool);
    let notificationId = "";

    await expect(
      transactionManager.run(async (executor) => {
        const hospital = await hospitalRepository.create(executor, {
          name: "알림 통합 테스트 병원",
          primaryDepartment: "테스트과",
          phoneNumber: "+82200000003",
          regionSido: "서울특별시",
          regionSigungu: "테스트구",
          address: "알림 테스트 후 롤백되는 주소",
        });
        await hospitalRepository.setApprovalStatus(executor, hospital.id, "approved");
        const categorySetResult = await executor.query<{ id: string }>(
          `
            INSERT INTO public.patient_category_sets
              (hospital_id, input_mode, effective_date, status)
            VALUES ($1, 'total_only', '2026-07-15', 'active')
            RETURNING id
          `,
          [hospital.id],
        );
        const categorySetId = categorySetResult.rows[0]?.id;
        if (!categorySetId) throw new Error("분류 설정 생성 결과가 없습니다.");
        const queue = await queueRepository.createOpen(executor, {
          hospitalId: hospital.id,
          categorySetId,
          queueDate: "2026-07-15",
        });
        const slot = await waitingRepository.allocateRegistrationSlot(executor, queue.id);
        const waiting = await waitingRepository.create(executor, {
          queueId: queue.id,
          accountId: null,
          source: "onsite",
          phoneNumber: "+821012345679",
          status: "onsite_waiting",
          patientCount: 1,
          lookupTokenHash: "b".repeat(64),
          ...slot,
        });
        const input = {
          waitingEntryId: waiting.id,
          notificationType: "onsite_registered" as const,
          provider: "mock_kakao" as const,
          dedupeKey: "onsite_registered",
          templateCode: "BJ_ONSITE_REGISTERED" as const,
          variables: { hospitalName: hospital.name, ticketNumber: waiting.ticketNumber },
        };
        const pending = await notificationRepository.createPending(executor, input);
        if (!pending) throw new Error("알림 로그 생성 결과가 없습니다.");
        notificationId = pending.id;
        const duplicate = await notificationRepository.createPending(executor, input);
        const sent = await notificationRepository.markSent(
          executor,
          pending.id,
          "mock-integration-message",
        );
        const logs = await notificationRepository.listByWaitingEntry(executor, waiting.id);

        expect(duplicate).toBeNull();
        expect(sent).toMatchObject({
          deliveryStatus: "sent",
          providerMessageId: "mock-integration-message",
        });
        expect(logs).toHaveLength(1);
        expect(JSON.stringify(logs[0]?.payload)).not.toContain("+821012345679");
        throw new Error("ROLLBACK_TEST");
      }),
    ).rejects.toThrow("ROLLBACK_TEST");

    expect(notificationId).not.toBe("");
    const result = await databasePool.query(
      "SELECT id FROM public.notification_logs WHERE id = $1",
      [notificationId],
    );
    expect(result.rows).toHaveLength(0);
  });
});
