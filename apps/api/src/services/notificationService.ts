import type {
  NotificationTemplateVariables,
  NotificationType,
} from "@baro-jinryo/shared";
import { notificationTemplateCodes } from "@baro-jinryo/shared";
import type { DatabaseExecutor } from "../db/databaseExecutor.js";
import type { NotificationProvider } from "../notifications/notificationProvider.js";
import type {
  NotificationLog,
  NotificationRepository,
} from "../repositories/notificationRepository.js";

export interface SendNotificationInput {
  waitingEntryId: string;
  recipientPhone: string;
  notificationType: NotificationType;
  dedupeKey: string;
  variables: NotificationTemplateVariables;
}

export type SendNotificationResult =
  | { duplicate: true; notification: null }
  | { duplicate: false; notification: NotificationLog };

export interface NotificationSender {
  send(
    executor: DatabaseExecutor,
    input: SendNotificationInput,
  ): Promise<SendNotificationResult>;
}

export class NotificationService implements NotificationSender {
  constructor(
    private readonly repository: NotificationRepository,
    private readonly provider: NotificationProvider,
  ) {}

  async send(
    executor: DatabaseExecutor,
    input: SendNotificationInput,
  ): Promise<SendNotificationResult> {
    const templateCode = notificationTemplateCodes[input.notificationType];
    const pending = await this.repository.createPending(executor, {
      waitingEntryId: input.waitingEntryId,
      notificationType: input.notificationType,
      provider: this.provider.name,
      dedupeKey: input.dedupeKey,
      templateCode,
      variables: sanitizeNotificationLogVariables(input.variables),
    });
    if (!pending) return { duplicate: true, notification: null };

    try {
      const delivery = await this.provider.send({
        recipientPhone: input.recipientPhone,
        templateCode,
        variables: input.variables,
      });
      const notification = delivery.ok
        ? await this.repository.markSent(
            executor,
            pending.id,
            delivery.providerMessageId,
          )
        : await this.repository.markFailed(executor, pending.id, delivery.errorCode);
      return { duplicate: false, notification };
    } catch {
      const notification = await this.repository.markFailed(
        executor,
        pending.id,
        "PROVIDER_EXCEPTION",
      );
      return { duplicate: false, notification };
    }
  }
}

function sanitizeNotificationLogVariables(
  variables: NotificationTemplateVariables,
): NotificationTemplateVariables {
  return Object.fromEntries(
    Object.entries(variables).map(([key, value]) => [
      key,
      key.toLowerCase().includes("url") ? "[REDACTED]" : value,
    ]),
  );
}
