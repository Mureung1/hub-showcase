import type { QueryResult, QueryResultRow } from "pg";
import { describe, expect, it } from "vitest";
import type { DatabaseExecutor } from "../../db/databaseExecutor.js";
import { PgWaitingExpirationRepository } from "./pgWaitingExpirationRepository.js";

class SequencedExecutor implements DatabaseExecutor {
  readonly calls: Array<{ queryText: string; values: unknown[] | undefined }> = [];

  constructor(private readonly rowsByCall: QueryResultRow[][]) {}

  async query<Row extends QueryResultRow>(
    queryText: string,
    values?: unknown[],
  ): Promise<QueryResult<Row>> {
    this.calls.push({ queryText, values });
    const rows = this.rowsByCall.shift() ?? [];
    return {
      command: "SELECT",
      rowCount: rows.length,
      oid: 0,
      fields: [],
      rows: rows as Row[],
    };
  }
}

describe("PgWaitingExpirationRepository", () => {
  it("트랜잭션 범위 advisory lock을 시도한다", async () => {
    const executor = new SequencedExecutor([[{ acquired: true }]]);
    const repository = new PgWaitingExpirationRepository();

    await expect(repository.tryAcquireJobLock(executor)).resolves.toBe(true);
    expect(executor.calls[0]?.queryText).toContain("pg_try_advisory_xact_lock");
  });

  it("기한이 지난 입장 요청만 조회한다", async () => {
    const executor = new SequencedExecutor([
      [
        {
          waiting_entry_id: "f904537c-6d56-43bc-9cf4-f33af8d5be03",
          hospital_name: "서울이비인후과",
        },
      ],
    ]);
    const repository = new PgWaitingExpirationRepository();
    const now = new Date("2026-07-21T07:00:00.000Z");

    await expect(repository.listExpired(executor, now)).resolves.toEqual([
      {
        waitingEntryId: "f904537c-6d56-43bc-9cf4-f33af8d5be03",
        hospitalName: "서울이비인후과",
      },
    ]);
    expect(executor.calls[0]?.queryText).toContain("arrival_deadline_at <= $1");
    expect(executor.calls[0]?.queryText).toContain("queue.status IN ('open', 'paused')");
    expect(executor.calls[0]?.values).toEqual([now]);
  });

  it("기한이 남고 앞선 활성 대기가 없는 미도착 후보만 조회한다", async () => {
    const executor = new SequencedExecutor([[]]);
    const repository = new PgWaitingExpirationRepository();

    await repository.listTurnReached(executor, new Date());

    expect(executor.calls[0]?.queryText).toContain("arrival_deadline_at > $1");
    expect(executor.calls[0]?.queryText).toContain("no_show_move_count = 0");
    expect(executor.calls[0]?.queryText).toContain("NOT EXISTS");
  });
});
