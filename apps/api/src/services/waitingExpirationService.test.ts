import type { QueryResult, QueryResultRow } from "pg";
import { describe, expect, it, vi } from "vitest";
import type { DatabaseExecutor } from "../db/databaseExecutor.js";
import type { TransactionManager } from "../db/transactionManager.js";
import type { WaitingEventRepository } from "../repositories/waitingEventRepository.js";
import type { WaitingExpirationRepository } from "../repositories/waitingExpirationRepository.js";
import type { WaitingEntry, WaitingRepository } from "../repositories/waitingRepository.js";
import type { NotificationSender } from "./notificationService.js";
import { WaitingExpirationService } from "./waitingExpirationService.js";

class UnusedExecutor implements DatabaseExecutor {
  async query<Row extends QueryResultRow>(): Promise<QueryResult<Row>> {
    throw new Error("단위 테스트에서는 SQL을 실행하지 않습니다.");
  }
}

class InlineTransactionManager implements TransactionManager {
  readonly executor = new UnusedExecutor();
  async run<Result>(work: (executor: DatabaseExecutor) => Promise<Result>) {
    return work(this.executor);
  }
}

const now = new Date("2026-07-21T07:00:00.000Z");
const baseWaiting: WaitingEntry = {
  id: "f904537c-6d56-43bc-9cf4-f33af8d5be03",
  queueId: "9d166db8-b36f-409e-9e7b-c97d66bdb53f",
  accountId: "bdd50fb2-0ac9-45c5-bf74-7a9299cb086b",
  source: "remote",
  phoneNumber: "+821012345678",
  ticketNumber: "5",
  status: "entry_requested",
  queueOrder: 1,
  patientCount: 1,
  arrivedPatientCount: 0,
  calledPatientCount: 0,
  lookupTokenHash: null,
  patientDeferCount: 0,
  noShowMoveCount: 0,
  preparationNotifiedAt: now,
  onsiteNearTurnNotifiedAt: null,
  entryRequestedAt: now,
  arrivalDeadlineAt: now,
  calledAt: null,
  cancelledAt: null,
  createdAt: now,
  updatedAt: now,
  version: 1,
};

function createService(lockAcquired = true) {
  const expiredCandidate = {
    waitingEntryId: baseWaiting.id,
    queueId: baseWaiting.queueId,
    hospitalName: "서울이비인후과",
    averageMinutesPerPatient: 15,
    preparationThreshold: 7,
    entryThreshold: 3,
  };
  const turnReachedCandidate = {
    waitingEntryId: "55993443-9f20-448a-b9f6-9ca9312f3cf8",
    queueId: baseWaiting.queueId,
    hospitalName: "서울이비인후과",
    averageMinutesPerPatient: 15,
    preparationThreshold: 7,
    entryThreshold: 3,
  };
  const tryAcquireJobLock = vi.fn(async () => lockAcquired);
  const listExpired = vi.fn(async () => [expiredCandidate]);
  const listTurnReached = vi.fn(async () => [turnReachedCandidate]);
  const findById = vi.fn(async (_executor, waitingEntryId: string) => ({
    ...baseWaiting,
    id: waitingEntryId,
  }));
  const cancelExpired = vi.fn(async () => ({
    ...baseWaiting,
    status: "cancelled" as const,
    cancelledAt: now,
  }));
  const moveNoShowToEnd = vi.fn(async () => ({
    waiting: { ...baseWaiting, queueOrder: 8, noShowMoveCount: 1 },
    previousQueueOrder: 1,
  }));
  const create = vi.fn(async () => ({}));
  const send = vi.fn(async () => ({ duplicate: true as const, notification: null }));
  const processQueue = vi.fn(async () => undefined);
  const service = new WaitingExpirationService(
    new InlineTransactionManager(),
    { tryAcquireJobLock, listExpired, listTurnReached } as WaitingExpirationRepository,
    { findById, cancelExpired, moveNoShowToEnd } as unknown as WaitingRepository,
    { create } as unknown as WaitingEventRepository,
    { send } satisfies NotificationSender,
    { processQueue },
    { patientWebOrigin: "https://patient.example.test" },
  );
  return {
    service,
    tryAcquireJobLock,
    listExpired,
    listTurnReached,
    cancelExpired,
    moveNoShowToEnd,
    create,
    send,
    processQueue,
  };
}

describe("WaitingExpirationService", () => {
  it("잠금을 얻지 못하면 대상 조회와 상태 변경을 건너뛴다", async () => {
    const dependencies = createService(false);

    await expect(dependencies.service.run(now)).resolves.toEqual({
      lockAcquired: false,
      cancelledCount: 0,
      movedCount: 0,
    });
    expect(dependencies.listExpired).not.toHaveBeenCalled();
    expect(dependencies.cancelExpired).not.toHaveBeenCalled();
  });

  it("만료 취소를 먼저 처리한 뒤 차례 도달 미도착을 마지막으로 이동한다", async () => {
    const dependencies = createService();

    await expect(dependencies.service.run(now)).resolves.toEqual({
      lockAcquired: true,
      cancelledCount: 1,
      movedCount: 1,
    });
    expect(dependencies.listExpired.mock.invocationCallOrder[0]).toBeLessThan(
      dependencies.listTurnReached.mock.invocationCallOrder[0] ?? 0,
    );
    expect(dependencies.create).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ eventType: "cancelled" }),
    );
    expect(dependencies.create).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ eventType: "no_show_moved" }),
    );
    expect(dependencies.send).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ dedupeKey: "cancelled:arrival_deadline_expired" }),
    );
    expect(dependencies.processQueue).toHaveBeenCalledTimes(1);
    expect(dependencies.processQueue).toHaveBeenCalledWith(expect.anything(), {
      queueId: baseWaiting.queueId,
      hospitalName: "서울이비인후과",
      patientWebOrigin: "https://patient.example.test",
      averageMinutesPerPatient: 15,
      preparationThreshold: 7,
      entryThreshold: 3,
      now,
    });
  });
});
