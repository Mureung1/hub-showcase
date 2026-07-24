import type { QueryResult, QueryResultRow } from "pg";
import { describe, expect, it } from "vitest";
import type { DatabaseExecutor } from "../../db/databaseExecutor.js";
import { PgWaitingRepository } from "./pgWaitingRepository.js";

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

const queueId = "9d166db8-b36f-409e-9e7b-c97d66bdb53f";

function waitingRow(id: string, queueOrder: number) {
  const now = new Date("2026-07-15T09:00:00.000Z");
  return {
    id,
    queue_id: queueId,
    account_id: null,
    source: "onsite",
    phone_number: "+821012345678",
    ticket_number: String(queueOrder),
    status: "onsite_waiting",
    queue_order: queueOrder,
    patient_count: 1,
    lookup_token_hash: null,
    patient_defer_count: 0,
    no_show_move_count: 0,
    preparation_notified_at: null,
    onsite_near_turn_notified_at: null,
    entry_requested_at: null,
    arrival_deadline_at: null,
    called_at: null,
    cancelled_at: null,
    created_at: now,
    updated_at: now,
    version: 1,
  };
}

describe("PgWaitingRepository", () => {
  it("대기열 카운터와 활성 마지막 순서로 등록 위치를 발급한다", async () => {
    const executor = new SequencedDatabaseExecutor([
      [{ ticket_number: 1 }],
      [{ queue_order: 4 }],
    ]);
    const repository = new PgWaitingRepository();
    const queueId = "9d166db8-b36f-409e-9e7b-c97d66bdb53f";

    await expect(repository.allocateRegistrationSlot(executor, queueId)).resolves.toEqual({
      ticketNumber: "1",
      queueOrder: 4,
    });
    expect(executor.calls[0]?.queryText).toContain(
      "SET next_ticket_number = next_ticket_number + 1",
    );
    expect(executor.calls[1]?.queryText).toContain(
      "status IN ('remote_waiting', 'entry_requested', 'onsite_waiting')",
    );
  });

  it("원격 활성 환자 수 합계를 숫자로 변환한다", async () => {
    const executor = new SequencedDatabaseExecutor([[{ patient_count: "7" }]]);
    const repository = new PgWaitingRepository();

    await expect(
      repository.sumActiveRemotePatients(
        executor,
        "9d166db8-b36f-409e-9e7b-c97d66bdb53f",
      ),
    ).resolves.toBe(7);
  });

  it("원격 대기 환자를 입장 요청 상태로 바꾸고 도착 기한을 저장한다", async () => {
    const requestedAt = new Date("2026-07-15T09:00:00.000Z");
    const deadlineAt = new Date("2026-07-15T09:20:00.000Z");
    const executor = new SequencedDatabaseExecutor([
      [
        {
          id: "f904537c-6d56-43bc-9cf4-f33af8d5be03",
          queue_id: "9d166db8-b36f-409e-9e7b-c97d66bdb53f",
          account_id: "bdd50fb2-0ac9-45c5-bf74-7a9299cb086b",
          source: "remote",
          phone_number: "+821012345678",
          ticket_number: "5",
          status: "entry_requested",
          queue_order: 5,
          patient_count: 1,
          lookup_token_hash: null,
          patient_defer_count: 0,
          no_show_move_count: 0,
          preparation_notified_at: null,
          onsite_near_turn_notified_at: null,
          entry_requested_at: requestedAt,
          arrival_deadline_at: deadlineAt,
          called_at: null,
          cancelled_at: null,
          created_at: requestedAt,
          updated_at: requestedAt,
          version: 1,
        },
      ],
    ]);
    const repository = new PgWaitingRepository();

    const result = await repository.requestEntry(
      executor,
      "f904537c-6d56-43bc-9cf4-f33af8d5be03",
      requestedAt,
      deadlineAt,
    );

    expect(result).toMatchObject({
      status: "entry_requested",
      entryRequestedAt: requestedAt,
      arrivalDeadlineAt: deadlineAt,
    });
    expect(executor.calls[0]?.queryText).toContain("status = 'remote_waiting'");
    expect(executor.calls[0]?.values).toEqual([
      "f904537c-6d56-43bc-9cf4-f33af8d5be03",
      requestedAt,
      deadlineAt,
    ]);
  });

  it("차례에 도달한 미도착 환자를 마지막으로 한 번 이동한다", async () => {
    const updatedAt = new Date("2026-07-15T09:10:00.000Z");
    const deadlineAt = new Date("2026-07-15T09:20:00.000Z");
    const executor = new SequencedDatabaseExecutor([
      [
        {
          id: "f904537c-6d56-43bc-9cf4-f33af8d5be03",
          queue_id: "9d166db8-b36f-409e-9e7b-c97d66bdb53f",
          account_id: "bdd50fb2-0ac9-45c5-bf74-7a9299cb086b",
          source: "remote",
          phone_number: "+821012345678",
          ticket_number: "5",
          status: "entry_requested",
          queue_order: 8,
          patient_count: 1,
          lookup_token_hash: null,
          patient_defer_count: 1,
          no_show_move_count: 1,
          preparation_notified_at: null,
          onsite_near_turn_notified_at: null,
          entry_requested_at: new Date("2026-07-15T09:00:00.000Z"),
          arrival_deadline_at: deadlineAt,
          called_at: null,
          cancelled_at: null,
          created_at: new Date("2026-07-15T08:30:00.000Z"),
          updated_at: updatedAt,
          version: 1,
          previous_queue_order: 1,
        },
      ],
    ]);
    const repository = new PgWaitingRepository();

    const result = await repository.moveNoShowToEnd(
      executor,
      "f904537c-6d56-43bc-9cf4-f33af8d5be03",
      1,
    );

    expect(result).toMatchObject({
      previousQueueOrder: 1,
      waiting: {
        queueOrder: 8,
        patientDeferCount: 1,
        noShowMoveCount: 1,
        arrivalDeadlineAt: deadlineAt,
      },
    });
    expect(executor.calls[0]?.queryText).toContain("no_show_move_count = 0");
    expect(executor.calls[0]?.queryText).toContain("version = $2");
    expect(executor.calls[0]?.queryText).toContain("version = entry.version + 1");
    expect(executor.calls[0]?.queryText).toContain("ahead.queue_order < target.queue_order");
    expect(executor.calls[0]?.queryText).not.toContain("patient_defer_count =");
  });

  it("도착 기한이 지난 최신 입장 요청만 취소한다", async () => {
    const cancelledAt = new Date("2026-07-15T09:20:00.000Z");
    const executor = new SequencedDatabaseExecutor([[]]);
    const repository = new PgWaitingRepository();

    await expect(
      repository.cancelExpired(
        executor,
        "f904537c-6d56-43bc-9cf4-f33af8d5be03",
        1,
        cancelledAt,
      ),
    ).resolves.toBeNull();
    expect(executor.calls[0]?.queryText).toContain("arrival_deadline_at <= $3");
    expect(executor.calls[0]?.queryText).toContain("version = $2");
    expect(executor.calls[0]?.queryText).toContain("status = 'entry_requested'");
  });

  it("화면이 확인한 순서와 DB의 현재 순서가 다르면 순서 변경을 거절한다", async () => {
    const firstId = "f904537c-6d56-43bc-9cf4-f33af8d5be03";
    const secondId = "f904537c-6d56-43bc-9cf4-f33af8d5be04";
    const executor = new SequencedDatabaseExecutor([
      [],
      [waitingRow(firstId, 1), waitingRow(secondId, 2)],
    ]);
    const repository = new PgWaitingRepository();

    await expect(
      repository.reorderActive(
        executor,
        queueId,
        [secondId, firstId],
        [firstId, secondId],
      ),
    ).resolves.toBe(false);

    expect(executor.calls).toHaveLength(2);
    expect(executor.calls[0]?.queryText).toContain("FOR UPDATE");
  });
});
