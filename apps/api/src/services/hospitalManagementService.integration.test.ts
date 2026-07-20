import { describe, expect, it } from "vitest";
import type { DatabaseExecutor } from "../db/databaseExecutor.js";
import { databasePool } from "../db/pool.js";
import { PgTransactionManager, type TransactionManager } from "../db/transactionManager.js";
import { PgHospitalChangeRequestRepository } from "../repositories/pg/pgHospitalChangeRequestRepository.js";
import { PgHospitalRepository } from "../repositories/pg/pgHospitalRepository.js";
import { HospitalManagementService } from "./hospitalManagementService.js";

class ScopedTransactionManager implements TransactionManager {
  constructor(private readonly executor: DatabaseExecutor) {}
  async run<Result>(work: (executor: DatabaseExecutor) => Promise<Result>) {
    return work(this.executor);
  }
}

describe("HospitalManagementService Supabase integration", () => {
  it("변경 요청 승인과 병원 정보 반영을 같은 트랜잭션에서 수행하고 롤백한다", async () => {
    const outerTransaction = new PgTransactionManager(databasePool);
    await expect(
      outerTransaction.run(async (executor) => {
        const service = new HospitalManagementService(
          new ScopedTransactionManager(executor),
          new PgHospitalRepository(),
          new PgHospitalChangeRequestRepository(),
        );
        const hospitalId = "10000000-0000-4000-8000-000000000001";
        const staffId = "20000000-0000-4000-8000-000000000002";
        const platformId = "20000000-0000-4000-8000-000000000003";
        const state = await service.getManagementState(hospitalId);
        const proposedValues = {
          ...state.hospital,
          operatingHoursText: `${state.hospital.operatingHoursText} 통합 테스트`,
        };
        const { id } = await service.requestChange(hospitalId, staffId, proposedValues);

        const reviewed = await service.reviewChangeRequest(id, "approved", platformId);
        const updated = await service.getManagementState(hospitalId);

        expect(reviewed.status).toBe("approved");
        expect(updated.hospital.operatingHoursText).toBe(proposedValues.operatingHoursText);
        throw new Error("ROLLBACK_TEST");
      }),
    ).rejects.toThrow("ROLLBACK_TEST");
  });
});
