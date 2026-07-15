import type {
  NotificationDeliveryStatus,
  NotificationTemplateCode,
  NotificationTemplateVariables,
  NotificationType,
} from "@baro-jinryo/shared";
import type { DatabaseExecutor } from "../db/databaseExecutor.js";

export type NotificationProviderName = "mock_kakao";

export interface NotificationLog {
  id: string;
  waitingEntryId: string;
  notificationType: NotificationType;
  provider: NotificationProviderName;
  deliveryStatus: NotificationDeliveryStatus;
  dedupeKey: string;
  templateCode: NotificationTemplateCode;
  providerMessageId: string | null;
  payload: Record<string, unknown>;
  sentAt: Date | null;
  createdAt: Date;
}

export interface CreatePendingNotificationInput {
  waitingEntryId: string;
  notificationType: NotificationType;
  provider: NotificationProviderName;
  dedupeKey: string;
  templateCode: NotificationTemplateCode;
  variables: NotificationTemplateVariables;
}

export interface NotificationRepository {
  createPending(
    executor: DatabaseExecutor,
    input: CreatePendingNotificationInput,
  ): Promise<NotificationLog | null>;
  markSent(
    executor: DatabaseExecutor,
    notificationId: string,
    providerMessageId: string,
  ): Promise<NotificationLog>;
  markFailed(
    executor: DatabaseExecutor,
    notificationId: string,
    errorCode: string,
  ): Promise<NotificationLog>;
  listByWaitingEntry(
    executor: DatabaseExecutor,
    waitingEntryId: string,
  ): Promise<NotificationLog[]>;
}
