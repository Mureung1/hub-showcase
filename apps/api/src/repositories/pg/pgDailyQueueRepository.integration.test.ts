import { defaultQueueSettings } from "@baro-jinryo/shared";
import { describe, expect, it } from "vitest";
import { databasePool } from "../../db/pool.js";
import { PgTransactionManager } from "../../db/transactionManager.js";
import { PgDailyQueueRepository } from "./pgDailyQueueRepository.js";
import { PgHospitalRepository } from "./pgHospitalRepository.js";

describe("PgDailyQueueRepository development Supabase integration", () => {
  it("실제 대기열 생성 기본값을 확인하고 트랜잭션을 롤백한다", async () => {
    const queueRepository = new PgDailyQueueRepository();
    const hospitalRepository = new PgHospitalRepository();
    const transactionManager = new PgTransactionManager(databasePool);
    let createdQueueId = "";

    await expect(
      transactionManager.run(async (executor) => {
        const hospital = await hospitalRepository.create(executor, {
          name: "대기열 통합 테스트 병원",
          primaryDepartment: "테스트과",
          phoneNumber: "+82200000001",
          regionSido: "서울특별시",
          regionSigungu: "테스트구",
          address: "대기열 테스트 후 롤백되는 주소",
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
        createdQueueId = queue.id;

        expect(queue).toMatchObject({ status: "open", ...defaultQueueSettings });
        throw new Error("ROLLBACK_TEST");
      }),
    ).rejects.toThrow("ROLLBACK_TEST");

    expect(createdQueueId).not.toBe("");
    await expect(queueRepository.findById(databasePool, createdQueueId)).resolves.toBeNull();
  });
});
