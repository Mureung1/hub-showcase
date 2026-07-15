import { describe, expect, it } from "vitest";
import { databasePool } from "../../db/pool.js";
import { PgTransactionManager } from "../../db/transactionManager.js";
import { PgDailyQueueRepository } from "./pgDailyQueueRepository.js";
import { PgHospitalRepository } from "./pgHospitalRepository.js";
import { PgWaitingEventRepository } from "./pgWaitingEventRepository.js";
import { PgWaitingRepository } from "./pgWaitingRepository.js";

describe("PgWaitingRepository development Supabase integration", () => {
  it("숫자 접수번호로 현장 웨이팅과 이력을 생성하고 롤백한다", async () => {
    const hospitalRepository = new PgHospitalRepository();
    const queueRepository = new PgDailyQueueRepository();
    const waitingRepository = new PgWaitingRepository();
    const eventRepository = new PgWaitingEventRepository();
    const transactionManager = new PgTransactionManager(databasePool);
    let waitingId = "";

    await expect(
      transactionManager.run(async (executor) => {
        const hospital = await hospitalRepository.create(executor, {
          name: "웨이팅 통합 테스트 병원",
          primaryDepartment: "테스트과",
          phoneNumber: "+82200000002",
          regionSido: "서울특별시",
          regionSigungu: "테스트구",
          address: "웨이팅 테스트 후 롤백되는 주소",
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
          phoneNumber: "+821012345678",
          status: "onsite_waiting",
          patientCount: 2,
          lookupTokenHash: "a".repeat(64),
          ...slot,
        });
        waitingId = waiting.id;
        const event = await eventRepository.create(executor, {
          waitingEntryId: waiting.id,
          actorAccountId: null,
          actorType: "system",
          eventType: "registered",
          fromStatus: null,
          toStatus: "onsite_waiting",
          metadata: { source: "onsite" },
        });

        expect(waiting).toMatchObject({ ticketNumber: "1", queueOrder: 1, patientCount: 2 });
        expect(event.eventType).toBe("registered");
        await expect(waitingRepository.sumActiveRemotePatients(executor, queue.id)).resolves.toBe(0);
        throw new Error("ROLLBACK_TEST");
      }),
    ).rejects.toThrow("ROLLBACK_TEST");

    expect(waitingId).not.toBe("");
    await expect(waitingRepository.findById(databasePool, waitingId)).resolves.toBeNull();
  });
});
