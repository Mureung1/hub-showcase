import type { TransactionManager } from "../db/transactionManager.js";
import type { WaitingEventRepository } from "../repositories/waitingEventRepository.js";
import type { WaitingRepository } from "../repositories/waitingRepository.js";
import type { NotificationSender } from "./notificationService.js";

export class WaitingStateConflictError extends Error {
  constructor() {
    super("웨이팅 상태가 이미 변경되었습니다.");
    this.name = "WaitingStateConflictError";
  }
}

export class WaitingNoShowService {
  constructor(
    private readonly transactionManager: TransactionManager,
    private readonly waitingRepository: WaitingRepository,
    private readonly waitingEventRepository: WaitingEventRepository,
    private readonly notificationSender: NotificationSender,
  ) {}

  async moveToEnd(waitingEntryId: string) {
    return this.transactionManager.run(async (executor) => {
      const current = await this.waitingRepository.findById(executor, waitingEntryId);
      if (!current) throw new WaitingStateConflictError();

      const moved = await this.waitingRepository.moveNoShowToEnd(
        executor,
        current.id,
        current.updatedAt,
      );
      if (!moved) throw new WaitingStateConflictError();

      await this.waitingEventRepository.create(executor, {
        waitingEntryId: moved.waiting.id,
        actorAccountId: null,
        actorType: "system",
        eventType: "no_show_moved",
        fromStatus: "entry_requested",
        toStatus: "entry_requested",
        metadata: {
          previousQueueOrder: moved.previousQueueOrder,
          nextQueueOrder: moved.waiting.queueOrder,
          arrivalDeadlineAt: moved.waiting.arrivalDeadlineAt?.toISOString() ?? null,
        },
      });
      return moved.waiting;
    });
  }

  async cancelExpired(
    waitingEntryId: string,
    hospitalName: string,
    now: Date,
  ) {
    return this.transactionManager.run(async (executor) => {
      const current = await this.waitingRepository.findById(executor, waitingEntryId);
      if (!current) throw new WaitingStateConflictError();

      const cancelled = await this.waitingRepository.cancelExpired(
        executor,
        current.id,
        current.updatedAt,
        now,
      );
      if (!cancelled) throw new WaitingStateConflictError();

      await this.waitingEventRepository.create(executor, {
        waitingEntryId: cancelled.id,
        actorAccountId: null,
        actorType: "system",
        eventType: "cancelled",
        fromStatus: "entry_requested",
        toStatus: "cancelled",
        metadata: { reason: "arrival_deadline_expired" },
      });
      const notification = await this.notificationSender.send(executor, {
        waitingEntryId: cancelled.id,
        recipientPhone: cancelled.phoneNumber,
        notificationType: "cancelled",
        dedupeKey: "cancelled:arrival_deadline_expired",
        variables: {
          hospitalName,
          ticketNumber: cancelled.ticketNumber,
        },
      });
      return { waiting: cancelled, notification };
    });
  }
}
