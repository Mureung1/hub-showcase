import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import type { DatabaseExecutor } from "../db/databaseExecutor.js";
import { databasePool } from "../db/pool.js";
import { PgTransactionManager, type TransactionManager } from "../db/transactionManager.js";
import { PgDailyQueueRepository } from "../repositories/pg/pgDailyQueueRepository.js";
import { PgHospitalRepository } from "../repositories/pg/pgHospitalRepository.js";
import { PgPatientCategoryRepository } from "../repositories/pg/pgPatientCategoryRepository.js";
import { PgWaitingRepository } from "../repositories/pg/pgWaitingRepository.js";
import { OnsiteStatusService } from "./onsiteStatusService.js";

class ScopedTransactionManager implements TransactionManager {
  constructor(private readonly executor: DatabaseExecutor) {}
  async run<Result>(work: (executor: DatabaseExecutor) => Promise<Result>) {
    return work(this.executor);
  }
}

describe("OnsiteStatusService development Supabase integration", () => {
  it("토큰 해시로 실제 병원과 통합 대기 순서를 조회한 뒤 롤백한다", async () => {
    const transactionManager = new PgTransactionManager(databasePool);
    await expect(
      transactionManager.run(async (executor) => {
        const hospital = await new PgHospitalRepository().create(executor, {
          name: "상태 링크 테스트 병원",
          primaryDepartment: "정형외과",
          phoneNumber: "+82200000005",
          regionSido: "서울특별시",
          regionSigungu: "테스트구",
          address: "테스트 주소 5",
        });
        await executor.query(
          "UPDATE public.hospitals SET approval_status = 'approved', approved_at = now() WHERE id = $1",
          [hospital.id],
        );
        const category = await executor.query<{ id: string }>(
          `INSERT INTO public.patient_category_sets
             (hospital_id, input_mode, effective_date, status)
           VALUES ($1, 'total_only', '2026-07-16', 'active') RETURNING id`,
          [hospital.id],
        );
        const categorySetId = category.rows[0]?.id;
        if (!categorySetId) throw new Error("분류 설정 생성 실패");
        const queue = await new PgDailyQueueRepository().createOpen(executor, {
          hospitalId: hospital.id,
          categorySetId,
          queueDate: "2026-07-16",
        });
        const token = "onsite-status-integration-token-000000000001";
        const repository = new PgWaitingRepository();
        const slot = await repository.allocateRegistrationSlot(executor, queue.id);
        const waiting = await repository.create(executor, {
          queueId: queue.id,
          accountId: null,
          source: "onsite",
          phoneNumber: "+821012345679",
          status: "onsite_waiting",
          patientCount: 2,
          lookupTokenHash: createHash("sha256").update(token).digest("hex"),
          ...slot,
        });
        const service = new OnsiteStatusService(
          new ScopedTransactionManager(executor),
          repository,
          new PgDailyQueueRepository(),
          new PgPatientCategoryRepository(),
          new PgHospitalRepository(),
        );

        await expect(service.getByLookupToken(token)).resolves.toMatchObject({
          hospital: {
            name: "상태 링크 테스트 병원",
            specialty: "정형외과",
            address: "테스트 주소 5",
            phoneNumber: "+82200000005",
          },
          waiting: {
            entry: { id: waiting.id, source: "onsite", patientCount: 2 },
            position: 1,
            positionEnd: 2,
          },
        });
        await expect(service.getByLookupToken("x".repeat(43))).resolves.toBeNull();
        await executor.query(
          "UPDATE public.waiting_entries SET status = 'called', called_at = now() WHERE id = $1",
          [waiting.id],
        );
        const invalidated = await executor.query<{ lookup_token_hash: string | null }>(
          "SELECT lookup_token_hash FROM public.waiting_entries WHERE id = $1",
          [waiting.id],
        );
        expect(invalidated.rows[0]?.lookup_token_hash).toBeNull();
        await expect(service.getByLookupToken(token)).resolves.toBeNull();
        throw new Error("ROLLBACK_TEST");
      }),
    ).rejects.toThrow("ROLLBACK_TEST");
  });
});
