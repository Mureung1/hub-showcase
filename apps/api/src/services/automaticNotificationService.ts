import {
  decideAutomaticNotification,
  defaultQueueSettings,
} from "@baro-jinryo/shared";
import type { DatabaseExecutor } from "../db/databaseExecutor.js";
import type { WaitingEventRepository } from "../repositories/waitingEventRepository.js";
import type {
  WaitingEntry,
  WaitingRepository,
} from "../repositories/waitingRepository.js";
import type {
  NotificationSender,
  SendNotificationResult,
} from "./notificationService.js";

export interface ProcessAutomaticNotificationInput {
  waiting: WaitingEntry;
  currentPosition: number;
  estimatedMinutes: number;
  hospitalName: string;
  statusUrl: string;
  now: Date;
  preparationThreshold?: number;
  entryThreshold?: number;
  arrivalGraceMinutes?: number;
}

export interface ProcessAutomaticNotificationResult {
  waiting: WaitingEntry;
  notification: SendNotificationResult;
}

export class AutomaticNotificationService {
  constructor(
    private readonly waitingRepository: WaitingRepository,
    private readonly waitingEventRepository: WaitingEventRepository,
    private readonly notificationSender: NotificationSender,
  ) {}

  async process(
    executor: DatabaseExecutor,
    input: ProcessAutomaticNotificationInput,
  ): Promise<ProcessAutomaticNotificationResult | null> {
    const decision = decideAutomaticNotification({
      source: input.waiting.source,
      status: input.waiting.status,
      currentPosition: input.currentPosition,
      patientDeferCount: input.waiting.patientDeferCount,
      preparationNotifiedAt: input.waiting.preparationNotifiedAt,
      onsiteNearTurnNotifiedAt: input.waiting.onsiteNearTurnNotifiedAt,
      preparationThreshold:
        input.preparationThreshold ?? defaultQueueSettings.preparationThreshold,
      entryThreshold: input.entryThreshold ?? defaultQueueSettings.entryThreshold,
    });
    if (!decision) return null;

    if (decision.notificationType === "preparation") {
      const waiting = await this.waitingRepository.markPreparationNotified(
        executor,
        input.waiting.id,
        input.now,
      );
      if (!waiting) return null;
      const notification = await this.notificationSender.send(executor, {
        waitingEntryId: waiting.id,
        recipientPhone: waiting.phoneNumber,
        notificationType: decision.notificationType,
        dedupeKey: decision.dedupeKey,
        variables: {
          hospitalName: input.hospitalName,
          currentPosition: input.currentPosition,
          estimatedMinutes: input.estimatedMinutes,
          statusUrl: input.statusUrl,
        },
      });
      return { waiting, notification };
    }

    if (decision.notificationType === "onsite_near_turn") {
      const waiting = await this.waitingRepository.markOnsiteNearTurnNotified(
        executor,
        input.waiting.id,
        input.now,
      );
      if (!waiting) return null;
      const notification = await this.notificationSender.send(executor, {
        waitingEntryId: waiting.id,
        recipientPhone: waiting.phoneNumber,
        notificationType: decision.notificationType,
        dedupeKey: decision.dedupeKey,
        variables: {
          hospitalName: input.hospitalName,
          currentPosition: input.currentPosition,
          statusUrl: input.statusUrl,
        },
      });
      return { waiting, notification };
    }

    const arrivalGraceMinutes =
      input.arrivalGraceMinutes ?? defaultQueueSettings.arrivalGraceMinutes;
    const arrivalDeadlineAt = new Date(
      input.now.getTime() + arrivalGraceMinutes * 60_000,
    );
    const waiting = await this.waitingRepository.requestEntry(
      executor,
      input.waiting.id,
      input.now,
      arrivalDeadlineAt,
    );
    if (!waiting) return null;
    await this.waitingEventRepository.create(executor, {
      waitingEntryId: waiting.id,
      actorAccountId: null,
      actorType: "system",
      eventType: "entry_requested",
      fromStatus: "remote_waiting",
      toStatus: "entry_requested",
      metadata: {
        currentPosition: input.currentPosition,
        arrivalDeadlineAt: arrivalDeadlineAt.toISOString(),
      },
    });
    const notification = await this.notificationSender.send(executor, {
      waitingEntryId: waiting.id,
      recipientPhone: waiting.phoneNumber,
      notificationType: decision.notificationType,
      dedupeKey: decision.dedupeKey,
      variables: {
        hospitalName: input.hospitalName,
        currentPosition: input.currentPosition,
        arrivalGraceMinutes,
        statusUrl: input.statusUrl,
      },
    });
    return { waiting, notification };
  }
}
