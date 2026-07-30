import type { QueryResult, QueryResultRow } from "pg";
import { describe, expect, it, vi } from "vitest";
import type { DatabaseExecutor } from "../db/databaseExecutor.js";
import type { WaitingEventRepository } from "../repositories/waitingEventRepository.js";
import type {
  WaitingEntry,
  WaitingRepository,
} from "../repositories/waitingRepository.js";
import type { NotificationSender } from "./notificationService.js";
import { AutomaticNotificationService } from "./automaticNotificationService.js";

class UnusedExecutor implements DatabaseExecutor {
  async query<Row extends QueryResultRow>(): Promise<QueryResult<Row>> {
    throw new Error("단위 테스트에서는 SQL을 직접 실행하지 않습니다.");
  }
}

const executor = new UnusedExecutor();
const now = new Date("2026-07-15T09:00:00.000Z");
const waiting: WaitingEntry = {
  id: "f904537c-6d56-43bc-9cf4-f33af8d5be03",
  queueId: "9d166db8-b36f-409e-9e7b-c97d66bdb53f",
  accountId: "bdd50fb2-0ac9-45c5-bf74-7a9299cb086b",
  source: "remote",
  phoneNumber: "+821012345678",
  ticketNumber: "5",
  status: "remote_waiting",
  queueOrder: 5,
  patientCount: 1,
  arrivedPatientCount: 0,
  calledPatientCount: 0,
  lookupTokenHash: null,
  patientDeferCount: 0,
  noShowMoveCount: 0,
  preparationNotifiedAt: null,
  onsiteNearTurnNotifiedAt: null,
  entryRequestedAt: null,
  arrivalDeadlineAt: null,
  calledAt: null,
  cancelledAt: null,
  createdAt: now,
  updatedAt: now,
  version: 1,
};

function createDependencies() {
  const markPreparationNotified = vi.fn(
    async (_executor: DatabaseExecutor, _id: string, notifiedAt: Date) => ({
      ...waiting,
      preparationNotifiedAt: notifiedAt,
    }),
  );
  const requestEntry = vi.fn(
    async (
      _executor: DatabaseExecutor,
      _id: string,
      requestedAt: Date,
      arrivalDeadlineAt: Date,
    ) => ({
      ...waiting,
      status: "entry_requested" as const,
      entryRequestedAt: requestedAt,
      arrivalDeadlineAt,
    }),
  );
  const markOnsiteNearTurnNotified = vi.fn(
    async (_executor: DatabaseExecutor, _id: string, notifiedAt: Date) => ({
      ...waiting,
      source: "onsite" as const,
      accountId: null,
      status: "onsite_waiting" as const,
      onsiteNearTurnNotifiedAt: notifiedAt,
    }),
  );
  const listByQueue = vi.fn(async () => [waiting]);
  const waitingRepository = {
    listByQueue,
    markPreparationNotified,
    requestEntry,
    markOnsiteNearTurnNotified,
  } as unknown as WaitingRepository;
  const createEvent = vi.fn(async () => ({
    id: "52db7a71-4535-47c9-bfd4-50cf106a86f8",
    waitingEntryId: waiting.id,
    actorAccountId: null,
    actorType: "system" as const,
    eventType: "entry_requested" as const,
    fromStatus: "remote_waiting" as const,
    toStatus: "entry_requested" as const,
    metadata: {},
    createdAt: now,
  }));
  const waitingEventRepository = {
    create: createEvent,
  } as unknown as WaitingEventRepository;
  const send = vi.fn(async () => ({
    duplicate: true as const,
    notification: null,
  }));
  const notificationSender = { send } satisfies NotificationSender;
  const service = new AutomaticNotificationService(
    waitingRepository,
    waitingEventRepository,
    notificationSender,
  );
  return {
    service,
    listByQueue,
    markPreparationNotified,
    requestEntry,
    createEvent,
    send,
  };
}

const baseInput = {
  waiting,
  currentPosition: 6,
  estimatedMinutes: 50,
  hospitalName: "바로진료병원",
  statusUrl: "https://example.test/my-waiting",
  now,
};

describe("AutomaticNotificationService", () => {
  it("re-evaluates the queue and omits a status link for onsite notifications", async () => {
    const dependencies = createDependencies();
    dependencies.listByQueue.mockResolvedValue([
      {
        ...waiting,
        source: "onsite",
        accountId: null,
        status: "onsite_waiting",
      },
    ]);

    await dependencies.service.processQueue(executor, {
      queueId: waiting.queueId,
      hospitalName: baseInput.hospitalName,
      patientWebOrigin: "https://example.test",
      averageMinutesPerPatient: 10,
      preparationThreshold: 6,
      entryThreshold: 4,
      now,
    });

    expect(dependencies.send).toHaveBeenCalledWith(
      executor,
      expect.objectContaining({
        notificationType: "onsite_near_turn",
        variables: {
          hospitalName: baseInput.hospitalName,
          currentPosition: 1,
        },
      }),
    );
  });

  it("대기열의 평균 진료시간과 알림 기준을 자동 알림에 적용한다", async () => {
    const dependencies = createDependencies();
    dependencies.listByQueue.mockResolvedValue([
      {
        ...waiting,
        id: "53bf8d41-0aef-49b3-9b65-dd27151a4e92",
        accountId: null,
        source: "onsite",
        status: "onsite_waiting",
        patientCount: 6,
        onsiteNearTurnNotifiedAt: now,
      },
      waiting,
    ]);

    await dependencies.service.processQueue(executor, {
      queueId: waiting.queueId,
      hospitalName: baseInput.hospitalName,
      patientWebOrigin: "https://example.test",
      now,
      averageMinutesPerPatient: 15,
      preparationThreshold: 7,
      entryThreshold: 3,
    });

    expect(dependencies.send).toHaveBeenCalledWith(
      executor,
      expect.objectContaining({
        waitingEntryId: waiting.id,
        notificationType: "preparation",
        variables: expect.objectContaining({
          currentPosition: 7,
          estimatedMinutes: 90,
        }),
      }),
    );
  });

  it("6번째 준비 알림에 현재 순서와 예상 시간을 넣는다", async () => {
    const dependencies = createDependencies();

    await dependencies.service.process(executor, baseInput);

    expect(dependencies.markPreparationNotified).toHaveBeenCalledWith(
      executor,
      waiting.id,
      now,
    );
    expect(dependencies.send).toHaveBeenCalledWith(executor, {
      waitingEntryId: waiting.id,
      recipientPhone: waiting.phoneNumber,
      notificationType: "preparation",
      dedupeKey: "preparation",
      variables: {
        hospitalName: "바로진료병원",
        currentPosition: 6,
        estimatedMinutes: 50,
        statusUrl: "https://example.test/my-waiting",
      },
    });
  });

  it("4번째 도달 시 준비 알림 없이 상태와 20분 도착 기한을 저장한다", async () => {
    const dependencies = createDependencies();
    const deadline = new Date("2026-07-15T09:20:00.000Z");

    await dependencies.service.process(executor, {
      ...baseInput,
      currentPosition: 4,
      estimatedMinutes: 30,
    });

    expect(dependencies.markPreparationNotified).not.toHaveBeenCalled();
    expect(dependencies.requestEntry).toHaveBeenCalledWith(
      executor,
      waiting.id,
      now,
      deadline,
    );
    expect(dependencies.createEvent).toHaveBeenCalledWith(
      executor,
      expect.objectContaining({
        eventType: "entry_requested",
        fromStatus: "remote_waiting",
        toStatus: "entry_requested",
        metadata: {
          currentPosition: 4,
          arrivalDeadlineAt: deadline.toISOString(),
        },
      }),
    );
  });

  it("직접 미룬 환자의 두 번째 입장 요청은 미루기 회차 키를 사용한다", async () => {
    const dependencies = createDependencies();

    await dependencies.service.process(executor, {
      ...baseInput,
      waiting: { ...waiting, patientDeferCount: 1 },
      currentPosition: 4,
    });

    expect(dependencies.send).toHaveBeenCalledWith(
      executor,
      expect.objectContaining({ dedupeKey: "entry_requested:1" }),
    );
  });

  it("현장 환자는 내 앞 대기 인원이 입장 기준 이하가 되면 상태 변경 없이 임박 알림을 보낸다", async () => {
    const dependencies = createDependencies();

    const result = await dependencies.service.process(executor, {
      ...baseInput,
      waiting: {
        ...waiting,
        source: "onsite",
        accountId: null,
        status: "onsite_waiting",
      },
      currentPosition: 5,
    });

    expect(result?.waiting.status).toBe("onsite_waiting");
    expect(dependencies.send).toHaveBeenCalledWith(
      executor,
      expect.objectContaining({
        notificationType: "onsite_near_turn",
          dedupeKey: "onsite_near_turn",
          variables: {
            hospitalName: baseInput.hospitalName,
            currentPosition: 5,
          },
        }),
      );
  });
});
