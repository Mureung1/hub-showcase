import { describe, expect, it } from "vitest";
import { databasePool } from "../../db/pool.js";
import { PgHospitalApplicationRepository } from "./pgHospitalApplicationRepository.js";

describe("PgHospitalApplicationRepository development Supabase integration", () => {
  it("개발용 Supabase의 pending 상세 신청 목록을 실제로 조회한다", async () => {
    const repository = new PgHospitalApplicationRepository();

    await expect(repository.listPending(databasePool)).resolves.toEqual(expect.any(Array));
  });
});
