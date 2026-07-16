import type { QueryResult, QueryResultRow } from "pg";
import { describe, expect, it, vi } from "vitest";
import type { DatabaseExecutor } from "../db/databaseExecutor.js";
import type { TransactionManager } from "../db/transactionManager.js";
import type { WaitingEventRepository } from "../repositories/waitingEventRepository.js";
import type {
  WaitingEntry,
  WaitingRepository,
} from "../repositories/waitingRepository.js";
import type { NotificationSender } from "./notificationService.js";
import {
  WaitingNoShowService,
  WaitingStateConflictError,
} from "./waitingNoShowService.js";

class UnusedExecutor implements DatabaseExecutor {
  async query<Row extends QueryResultRow>(): Promise<QueryResult<Row>> {
    throw new Error("단위 테스트에서는 SQL을 직접 실행하지 않습니다.");
  }
}

class InlineTransactionManager implements TransactionManager {
  readonly executor = new UnusedExecutor();

  async run<Result>(work: (executor: DatabaseExecutor) => Promise<Result>) {
    return work(this.executor);
  }
}

const requestedAt = new Date("2026-07-15T09:00:00.000Z");
const deadlineAt = new Date("2026-07-15T09:20:00.000Z");
const waiting: WaitingEntry = {
  id: "f904537c-6d56-43bc-9cf4-f33af8d5be03",
  queueId: "9d166db8-b36f-409e-9e7b-c97d66bdb53f",
  accountId: "bdd50fb2-0ac9-45c5-bf74-7a9299cb086b",
  source: "remote",
  phoneNumber: "+821012345678",
  ticketNumber: "5",
  status: "entry_requested",
  queueOrder: 1,
  patientCount: 1,
  lookupTokenHash: null,
  patientDeferCount: 1,
  noShowMoveCount: 0,
  preparationNotifiedAt: requestedAt,
  onsiteNearTurnNotifiedAt: null,
  entryRequestedAt: requestedAt,
  arrivalDeadlineAt: deadlineAt,
  calledAt: null,
  cancelledAt: null,
  createdAt: new Date("2026-07-15T08:30:00.000Z"),
  updatedAt: new Date("2026-07-15T09:10:00.000Z"),
  version: 1,
};

function createDependencies() {
  const transactionManager = new InlineTransactionManager();
  let currentWaiting: WaitingEntry | null = waiting;
  let movedWaiting = {
    ...waiting,
    queueOrder: 8,
    noShowMoveCount: 1,
    updatedAt: new Date("2026-07-15T09:11:00.000Z"),
  };
  let cancelledWaiting: WaitingEntry | null = {
    ...waiting,
    status: "cancelled",
    cancelledAt: deadlineAt,
    lookupTokenHash: null,
    updatedAt: deadlineAt,
  };
  const findById = vi.fn(async () => currentWaiting);
  const moveNoShowToEnd = vi.fn(async () => ({
    waiting: movedWaiting,
    previousQueueOrder: waiting.queueOrder,
  }));
  const cancelExpired = vi.fn(async () => cancelledWaiting);
  const waitingRepository = {
    findById,
    moveNoShowToEnd,
    cancelExpired,
  } as unknown as WaitingRepository;
  const createEvent = vi.fn(async () => ({
    id: "52db7a71-4535-47c9-bfd4-50cf106a86f8",
    waitingEntryId: waiting.id,
    actorAccountId: null,
    actorType: "system" as const,
    eventType: "no_show_moved" as const,
    fromStatus: "entry_requested" as const,
    toStatus: "entry_requested" as const,
    metadata: {},
    createdAt: deadlineAt,
  }));
  const waitingEventRepository = {
    create: createEvent,
  } as unknown as WaitingEventRepository;
  const send = vi.fn(async () => ({
    duplicate: true as const,
    notification: null,
  }));
  const notificationSender = { send } satisfies NotificationSender;
  const service = new WaitingNoShowService(
    transactionManager,
    waitingRepository,
    waitingEventRepository,
    notificationSender,
  );
  return {
    transactionManager,
    service,
    findById,
    moveNoShowToEnd,
    cancelExpired,
    createEvent,
    send,
    setCurrentWaiting(value: WaitingEntry | null) {
      currentWaiting = value;
    },
    setMovedWaiting(value: WaitingEntry) {
      movedWaiting = value;
    },
    setCancelledWaiting(value: WaitingEntry | null) {
      cancelledWaiting = value;
    },
  };
}

describe("WaitingNoShowService", () => {
  it("차례 도달 미도착을 마지막으로 이동하고 기존 기한과 직접 미루기 횟수를 유지한다", async () => {
    const dependencies = createDependencies();

    const result = await dependencies.service.moveToEnd(waiting.id);

    expect(result).toMatchObject({
      queueOrder: 8,
      noShowMoveCount: 1,
      patientDeferCount: 1,
      arrivalDeadlineAt: deadlineAt,
    });
    expect(dependencies.moveNoShowToEnd).toHaveBeenCalledWith(
      dependencies.transactionManager.executor,
      waiting.id,
      waiting.updatedAt,
    );
    expect(dependencies.createEvent).toHaveBeenCalledWith(
      dependencies.transactionManager.executor,
      expect.objectContaining({
        eventType: "no_show_moved",
        metadata: {
          previousQueueOrder: 1,
          nextQueueOrder: 8,
          arrivalDeadlineAt: deadlineAt.toISOString(),
        },
      }),
    );
  });

  it("20분 기한이 지난 입장 요청을 취소하고 이력과 알림을 남긴다", async () => {
    const dependencies = createDependencies();

    const result = await dependencies.service.cancelExpired(
      waiting.id,
      "바로진료병원",
      deadlineAt,
    );

    expect(result.waiting.status).toBe("cancelled");
    expect(dependencies.cancelExpired).toHaveBeenCalledWith(
      dependencies.transactionManager.executor,
      waiting.id,
      waiting.updatedAt,
      deadlineAt,
    );
    expect(dependencies.send).toHaveBeenCalledWith(
      dependencies.transactionManager.executor,
      expect.objectContaining({
        notificationType: "cancelled",
        dedupeKey: "cancelled:arrival_deadline_expired",
      }),
    );
  });

  it("직원 도착 등으로 상태가 먼저 바뀌면 만료 취소를 중단한다", async () => {
    const dependencies = createDependencies();
    dependencies.setCancelledWaiting(null);

    await expect(
      dependencies.service.cancelExpired(waiting.id, "바로진료병원", deadlineAt),
    ).rejects.toBeInstanceOf(WaitingStateConflictError);
    expect(dependencies.createEvent).not.toHaveBeenCalled();
    expect(dependencies.send).not.toHaveBeenCalled();
  });
});
