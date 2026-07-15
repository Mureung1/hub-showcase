import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { databasePool } from "../../db/pool.js";
import { PgProfileRepository } from "./pgProfileRepository.js";

describe("PgProfileRepository development Supabase integration", () => {
  it("개발용 Supabase의 profiles 테이블을 실제로 조회한다", async () => {
    const repository = new PgProfileRepository();

    await expect(repository.findById(databasePool, randomUUID())).resolves.toBeNull();
  });
});
