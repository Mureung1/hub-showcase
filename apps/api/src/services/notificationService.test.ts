import type { QueryResult, QueryResultRow } from "pg";
import { describe, expect, it, vi } from "vitest";
import type { DatabaseExecutor } from "../db/databaseExecutor.js";
import { MockNotificationProvider } from "../notifications/mockNotificationProvider.js";
import type {
  CreatePendingNotificationInput,
  NotificationLog,
  NotificationRepository,
} from "../repositories/notificationRepository.js";
import { NotificationService } from "./notificationService.js";

class UnusedExecutor implements DatabaseExecutor {
  async query<Row extends QueryResultRow>(): Promise<QueryResult<Row>> {
    throw new Error("단위 테스트에서는 SQL을 직접 실행하지 않습니다.");
  }
}

const executor = new UnusedExecutor();
const now = new Date("2026-07-15T09:00:00.000Z");
const pending: NotificationLog = {
  id: "17185fca-7a06-460a-a76a-c9d35ee98d95",
  waitingEntryId: "f904537c-6d56-43bc-9cf4-f33af8d5be03",
  notificationType: "entry_requested",
  provider: "mock_kakao",
  deliveryStatus: "pending",
  dedupeKey: "entry_requested:0",
  templateCode: "BJ_ENTRY_REQUESTED",
  providerMessageId: null,
  payload: { position: 4 },
  sentAt: null,
  createdAt: now,
};

class FakeNotificationRepository implements NotificationRepository {
  nextPending: NotificationLog | null = pending;
  readonly createPending = vi.fn(
    async (
      _executor: DatabaseExecutor,
      _input: CreatePendingNotificationInput,
    ): Promise<NotificationLog | null> => this.nextPending,
  );
  readonly markSent = vi.fn(
    async (_executor: DatabaseExecutor, _id: string, providerMessageId: string) => ({
      ...pending,
      deliveryStatus: "sent" as const,
      providerMessageId,
      sentAt: now,
    }),
  );
  readonly markFailed = vi.fn(
    async (_executor: DatabaseExecutor, _id: string, errorCode: string) => ({
      ...pending,
      deliveryStatus: "failed" as const,
      payload: { ...pending.payload, deliveryErrorCode: errorCode },
      sentAt: now,
    }),
  );

  async listByWaitingEntry(): Promise<NotificationLog[]> {
    return [pending];
  }
}

const input = {
  waitingEntryId: pending.waitingEntryId,
  recipientPhone: "+821012345678",
  notificationType: "entry_requested" as const,
  dedupeKey: "entry_requested:0",
  variables: {
    hospitalName: "바로진료병원",
    currentPosition: 4,
    arrivalGraceMinutes: 20,
    statusUrl: "https://example.test/waiting/secret-token",
  },
};

describe("NotificationService", () => {
  it("템플릿을 선택해 provider에 보내고 성공을 저장한다", async () => {
    const repository = new FakeNotificationRepository();
    const provider = new MockNotificationProvider();
    const sendSpy = vi.spyOn(provider, "send");
    const service = new NotificationService(repository, provider);

    const result = await service.send(executor, input);

    expect(result.duplicate).toBe(false);
    expect(result.notification?.deliveryStatus).toBe("sent");
    expect(sendSpy).toHaveBeenCalledWith({
      recipientPhone: input.recipientPhone,
      templateCode: "BJ_ENTRY_REQUESTED",
      variables: input.variables,
    });
    expect(repository.createPending).toHaveBeenCalledWith(executor, {
      waitingEntryId: input.waitingEntryId,
      notificationType: "entry_requested",
      provider: "mock_kakao",
      dedupeKey: "entry_requested:0",
      templateCode: "BJ_ENTRY_REQUESTED",
      variables: { ...input.variables, statusUrl: "[REDACTED]" },
    });
  });

  it("provider 실패를 failed 로그로 저장한다", async () => {
    const repository = new FakeNotificationRepository();
    const provider = new MockNotificationProvider({ shouldFail: () => true });
    const service = new NotificationService(repository, provider);

    const result = await service.send(executor, input);

    expect(result.notification?.deliveryStatus).toBe("failed");
    expect(repository.markFailed).toHaveBeenCalledWith(
      executor,
      pending.id,
      "MOCK_DELIVERY_FAILED",
    );
  });

  it("같은 발생 조건의 로그가 있으면 provider 호출을 건너뛴다", async () => {
    const repository = new FakeNotificationRepository();
    repository.nextPending = null;
    const provider = new MockNotificationProvider();
    const sendSpy = vi.spyOn(provider, "send");
    const service = new NotificationService(repository, provider);

    await expect(service.send(executor, input)).resolves.toEqual({
      duplicate: true,
      notification: null,
    });
    expect(sendSpy).not.toHaveBeenCalled();
  });
});
