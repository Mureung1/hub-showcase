import type { QueryResult, QueryResultRow } from "pg";
import { describe, expect, it } from "vitest";
import { defaultQueueSettings } from "@baro-jinryo/shared";
import type { DatabaseExecutor } from "../../db/databaseExecutor.js";
import { PgDailyQueueRepository } from "./pgDailyQueueRepository.js";

class FakeDatabaseExecutor implements DatabaseExecutor {
  readonly calls: Array<{ queryText: string; values: unknown[] | undefined }> = [];

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

const now = new Date("2026-07-15T09:00:00.000Z");
const queueRow = {
  id: "9d166db8-b36f-409e-9e7b-c97d66bdb53f",
  hospital_id: "be0aa4da-8adc-4765-9622-e11ab406fc6d",
  category_set_id: "8b256fc8-33c7-4e76-b388-f8d6dadf06fc",
  queue_date: "2026-07-15",
  status: "open",
  average_minutes_per_patient: 10,
  preparation_threshold: 6,
  entry_threshold: 4,
  arrival_grace_minutes: 20,
  max_remote_waiting_patients: 20,
  next_ticket_number: 1,
  opened_at: now,
  closed_at: null,
  created_at: now,
  updated_at: now,
};

describe("PgDailyQueueRepository", () => {
  it("대기열을 open으로 만들고 DB 기본 설정을 읽는다", async () => {
    const executor = new FakeDatabaseExecutor([queueRow]);
    const repository = new PgDailyQueueRepository();

    const queue = await repository.createOpen(executor, {
      hospitalId: queueRow.hospital_id,
      categorySetId: queueRow.category_set_id,
      queueDate: queueRow.queue_date,
    });

    expect(queue).toMatchObject(defaultQueueSettings);
    expect(queue.status).toBe("open");
    expect(executor.calls[0]?.queryText).toContain("VALUES ($1, $2, $3, 'open', now())");
    expect(executor.calls[0]?.values).toEqual([
      queueRow.hospital_id,
      queueRow.category_set_id,
      queueRow.queue_date,
    ]);
  });

  it("병원과 운영일을 함께 사용해 대기열을 조회한다", async () => {
    const executor = new FakeDatabaseExecutor([]);
    const repository = new PgDailyQueueRepository();

    await expect(
      repository.findByHospitalAndDate(executor, queueRow.hospital_id, queueRow.queue_date),
    ).resolves.toBeNull();
    expect(executor.calls[0]?.values).toEqual([queueRow.hospital_id, queueRow.queue_date]);
  });

  it("운영 설정만 갱신하고 기존 대기열은 유지한다", async () => {
    const executor = new FakeDatabaseExecutor([
      {
        ...queueRow,
        average_minutes_per_patient: 15,
        preparation_threshold: 7,
        max_remote_waiting_patients: 12,
      },
    ]);
    const repository = new PgDailyQueueRepository();

    const updated = await repository.updateSettings(executor, queueRow.id, {
      averageMinutesPerPatient: 15,
      preparationThreshold: 7,
      entryThreshold: 4,
      maxRemoteWaitingPatients: 12,
    });

    expect(updated).toMatchObject({
      id: queueRow.id,
      averageMinutesPerPatient: 15,
      preparationThreshold: 7,
      entryThreshold: 4,
      maxRemoteWaitingPatients: 12,
    });
    expect(executor.calls[0]?.queryText).not.toContain("waiting_entries");
    expect(executor.calls[0]?.values).toEqual([queueRow.id, 15, 7, 4, 12]);
  });
});
