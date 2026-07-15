import type { QueryResult, QueryResultRow } from "pg";
import { describe, expect, it } from "vitest";
import type { DatabaseExecutor } from "../../db/databaseExecutor.js";
import { PgProfileRepository } from "./pgProfileRepository.js";

interface QueryCall {
  queryText: string;
  values: unknown[] | undefined;
}

class FakeDatabaseExecutor implements DatabaseExecutor {
  readonly calls: QueryCall[] = [];

  constructor(private readonly resultRows: QueryResultRow[]) {}

  async query<Row extends QueryResultRow>(
    queryText: string,
    values?: unknown[],
  ): Promise<QueryResult<Row>> {
    this.calls.push({ queryText, values });
    return {
      command: "SELECT",
      rowCount: this.resultRows.length,
      oid: 0,
      fields: [],
      rows: this.resultRows as Row[],
    };
  }
}

const profileRow = {
  id: "c468ffd3-cd28-4c52-a191-8d89d17cb789",
  phone_number: "+821012345678",
  account_type: "patient",
  status: "active",
  created_at: new Date("2026-07-15T09:00:00.000Z"),
  updated_at: new Date("2026-07-15T09:00:00.000Z"),
};

describe("PgProfileRepository", () => {
  it("Auth ID로 프로필을 조회하고 camelCase로 변환한다", async () => {
    const executor = new FakeDatabaseExecutor([profileRow]);
    const repository = new PgProfileRepository();

    const profile = await repository.findById(executor, profileRow.id);

    expect(profile).toEqual({
      id: profileRow.id,
      phoneNumber: "+821012345678",
      accountType: "patient",
      status: "active",
      createdAt: profileRow.created_at,
      updatedAt: profileRow.updated_at,
    });
    expect(executor.calls[0]?.values).toEqual([profileRow.id]);
  });

  it("조회 결과가 없으면 null을 반환한다", async () => {
    const executor = new FakeDatabaseExecutor([]);
    const repository = new PgProfileRepository();

    await expect(repository.findByPhoneNumber(executor, "+821099999999")).resolves.toBeNull();
  });

  it("프로필 생성 시 상태를 클라이언트 입력으로 받지 않는다", async () => {
    const executor = new FakeDatabaseExecutor([profileRow]);
    const repository = new PgProfileRepository();

    await repository.create(executor, {
      id: profileRow.id,
      phoneNumber: "+821012345678",
      accountType: "patient",
    });

    expect(executor.calls[0]?.queryText).toContain(
      "INSERT INTO public.profiles (id, phone_number, account_type)",
    );
    expect(executor.calls[0]?.values).toEqual([
      profileRow.id,
      "+821012345678",
      "patient",
    ]);
  });
});
