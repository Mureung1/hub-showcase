import type { QueryResult, QueryResultRow } from "pg";
import { describe, expect, it } from "vitest";
import type { DatabaseExecutor } from "../../db/databaseExecutor.js";
import { PgNotificationRepository } from "./pgNotificationRepository.js";

class SequencedDatabaseExecutor implements DatabaseExecutor {
  readonly calls: Array<{ queryText: string; values: unknown[] | undefined }> = [];

  constructor(private readonly resultSets: QueryResultRow[][]) {}

  async query<Row extends QueryResultRow>(
    queryText: string,
    values?: unknown[],
  ): Promise<QueryResult<Row>> {
    this.calls.push({ queryText, values });
    const rows = this.resultSets.shift() ?? [];
    return {
      command: "SELECT",
      rowCount: rows.length,
      oid: 0,
      fields: [],
      rows: rows as Row[],
    };
  }
}

const now = new Date("2026-07-15T09:00:00.000Z");
const pendingRow = {
  id: "17185fca-7a06-460a-a76a-c9d35ee98d95",
  waiting_entry_id: "f904537c-6d56-43bc-9cf4-f33af8d5be03",
  notification_type: "preparation",
  provider: "mock_kakao",
  delivery_status: "pending",
  dedupe_key: "preparation",
  template_code: "BJ_PREPARATION",
  provider_message_id: null,
  payload: { position: 6 },
  sent_at: null,
  created_at: now,
};

describe("PgNotificationRepository", () => {
  it("중복 방지 키와 템플릿 변수로 pending 로그를 만든다", async () => {
    const executor = new SequencedDatabaseExecutor([[pendingRow]]);
    const repository = new PgNotificationRepository();

    const log = await repository.createPending(executor, {
      waitingEntryId: pendingRow.waiting_entry_id,
      notificationType: "preparation",
      provider: "mock_kakao",
      dedupeKey: "preparation",
      templateCode: "BJ_PREPARATION",
      variables: { position: 6 },
    });

    expect(log?.dedupeKey).toBe("preparation");
    expect(executor.calls[0]?.queryText).toContain(
      "ON CONFLICT (waiting_entry_id, dedupe_key) DO NOTHING",
    );
    expect(executor.calls[0]?.values).not.toContain("+821012345678");
  });

  it("이미 같은 발생 조건이 저장되어 있으면 null을 반환한다", async () => {
    const executor = new SequencedDatabaseExecutor([[]]);
    const repository = new PgNotificationRepository();

    await expect(
      repository.createPending(executor, {
        waitingEntryId: pendingRow.waiting_entry_id,
        notificationType: "preparation",
        provider: "mock_kakao",
        dedupeKey: "preparation",
        templateCode: "BJ_PREPARATION",
        variables: { position: 6 },
      }),
    ).resolves.toBeNull();
  });

  it("실패 코드를 payload에 추가하고 failed로 바꾼다", async () => {
    const failedRow = {
      ...pendingRow,
      delivery_status: "failed",
      payload: { position: 6, deliveryErrorCode: "MOCK_DELIVERY_FAILED" },
      sent_at: now,
    };
    const executor = new SequencedDatabaseExecutor([[failedRow]]);
    const repository = new PgNotificationRepository();

    const log = await repository.markFailed(
      executor,
      pendingRow.id,
      "MOCK_DELIVERY_FAILED",
    );

    expect(log.deliveryStatus).toBe("failed");
    expect(log.payload.deliveryErrorCode).toBe("MOCK_DELIVERY_FAILED");
  });
});
