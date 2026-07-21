import type { TransactionManager } from "../db/transactionManager.js";
import type { WaitingEventRepository } from "../repositories/waitingEventRepository.js";
import type { WaitingExpirationRepository } from "../repositories/waitingExpirationRepository.js";
import type { WaitingRepository } from "../repositories/waitingRepository.js";
import type { NotificationSender } from "./notificationService.js";

export interface WaitingExpirationRunResult {
  lockAcquired: boolean;
  cancelledCount: number;
  movedCount: number;
}

export class WaitingExpirationService {
  constructor(
    private readonly transactionManager: TransactionManager,
    private readonly expirationRepository: WaitingExpirationRepository,
    private readonly waitingRepository: WaitingRepository,
    private readonly waitingEventRepository: WaitingEventRepository,
    private readonly notificationSender: NotificationSender,
  ) {}

  async run(now = new Date()): Promise<WaitingExpirationRunResult> {
    return this.transactionManager.run(async (executor) => {
      const lockAcquired = await this.expirationRepository.tryAcquireJobLock(executor);
      if (!lockAcquired) {
        return { lockAcquired: false, cancelledCount: 0, movedCount: 0 };
      }

      let cancelledCount = 0;
      const expiredCandidates = await this.expirationRepository.listExpired(executor, now);
      for (const candidate of expiredCandidates) {
        const current = await this.waitingRepository.findById(
          executor,
          candidate.waitingEntryId,
        );
        if (!current) continue;
        const cancelled = await this.waitingRepository.cancelExpired(
          executor,
          current.id,
          current.version,
          now,
        );
        if (!cancelled) continue;

        await this.waitingEventRepository.create(executor, {
          waitingEntryId: cancelled.id,
          actorAccountId: null,
          actorType: "system",
          eventType: "cancelled",
          fromStatus: "entry_requested",
          toStatus: "cancelled",
          metadata: { reason: "arrival_deadline_expired" },
        });
        await this.notificationSender.send(executor, {
          waitingEntryId: cancelled.id,
          recipientPhone: cancelled.phoneNumber,
          notificationType: "cancelled",
          dedupeKey: "cancelled:arrival_deadline_expired",
          variables: {
            hospitalName: candidate.hospitalName,
            ticketNumber: cancelled.ticketNumber,
          },
        });
        cancelledCount += 1;
      }

      let movedCount = 0;
      const turnReachedCandidates = await this.expirationRepository.listTurnReached(
        executor,
        now,
      );
      for (const candidate of turnReachedCandidates) {
        const current = await this.waitingRepository.findById(
          executor,
          candidate.waitingEntryId,
        );
        if (!current) continue;
        const moved = await this.waitingRepository.moveNoShowToEnd(
          executor,
          current.id,
          current.version,
        );
        if (!moved) continue;

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
        movedCount += 1;
      }

      return { lockAcquired: true, cancelledCount, movedCount };
    });
  }
}
