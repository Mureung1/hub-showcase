import { describe, expect, it } from "vitest";
import { databasePool } from "../../db/pool.js";
import { PgTransactionManager } from "../../db/transactionManager.js";
import { PgHospitalRepository } from "./pgHospitalRepository.js";

describe("PgHospitalRepository development Supabase integration", () => {
  it("실제 병원 생성 SQL을 실행하고 실패한 트랜잭션을 롤백한다", async () => {
    const repository = new PgHospitalRepository();
    const transactionManager = new PgTransactionManager(databasePool);
    let createdHospitalId = "";

    await expect(
      transactionManager.run(async (executor) => {
        const hospital = await repository.create(executor, {
          name: "통합 테스트 병원",
          primaryDepartment: "테스트과",
          phoneNumber: "+82200000000",
          regionSido: "서울특별시",
          regionSigungu: "테스트구",
          address: "테스트 후 롤백되는 주소",
        });
        createdHospitalId = hospital.id;
        await expect(repository.findById(executor, hospital.id)).resolves.toMatchObject({
          id: hospital.id,
          approvalStatus: "pending",
        });
        throw new Error("ROLLBACK_TEST");
      }),
    ).rejects.toThrow("ROLLBACK_TEST");

    expect(createdHospitalId).not.toBe("");
    await expect(repository.findById(databasePool, createdHospitalId)).resolves.toBeNull();
  });
});
